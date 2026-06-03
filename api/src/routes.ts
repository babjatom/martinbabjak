import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createBooking,
  getBooking,
  cancelBooking,
  SlotAlreadyBookedError,
  SlotNotFoundError,
  BookingNotFoundError,
  BookingAlreadyCancelledError,
} from './bookings';
import { listAvailableSlots, listAllSlots, createSlot, deactivateSlot } from './slots';
import { getConfig, updateConfig } from './config';

export const router = Router();

router.get('/config', (_req: Request, res: Response): void => {
  res.json({ config: getConfig() });
});

const UpdateConfigSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  bg_image_url: z.string().max(2000).optional(),
});

router.put('/config', (req: Request, res: Response): void => {
  const parsed = UpdateConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }
  res.json({ config: updateConfig(parsed.data) });
});

router.get('/slots', (_req: Request, res: Response): void => {
  res.json({ slots: listAvailableSlots() });
});

router.get('/slots/all', (_req: Request, res: Response): void => {
  res.json({ slots: listAllSlots() });
});

const CreateSlotSchema = z.object({
  label: z.string().min(1).max(200),
  starts_at: z.string().datetime(),
  duration_m: z.number().int().positive().max(480).optional(),
});

router.post('/slots', (req: Request, res: Response): void => {
  const parsed = CreateSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }
  res.status(201).json({ slot: createSlot(parsed.data) });
});

router.delete('/slots/:id', (req: Request, res: Response): void => {
  try {
    deactivateSlot(req.params['id'] ?? '');
    res.json({ message: 'Slot deactivated' });
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      res.status(404).json({ error: 'SLOT_NOT_FOUND', message: err.message });
    } else {
      throw err;
    }
  }
});

const CreateBookingSchema = z.object({
  slot_id: z.string().min(1),
  user_id: z.string().min(1),
  idempotency_key: z.string().min(1),
});

router.post('/bookings', (req: Request, res: Response): void => {
  const parsed = CreateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const { booking, created } = createBooking(parsed.data);
    res.status(created ? 201 : 200).json({ booking });
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      res.status(404).json({ error: 'SLOT_NOT_FOUND', message: err.message });
    } else if (err instanceof SlotAlreadyBookedError) {
      res.status(409).json({ error: 'SLOT_ALREADY_BOOKED', message: err.message });
    } else {
      throw err;
    }
  }
});

router.get('/bookings/:id', (req: Request, res: Response): void => {
  try {
    res.json({ booking: getBooking(req.params['id'] ?? '') });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      res.status(404).json({ error: 'BOOKING_NOT_FOUND', message: err.message });
    } else {
      throw err;
    }
  }
});

router.delete('/bookings/:id', (req: Request, res: Response): void => {
  try {
    res.json({ booking: cancelBooking(req.params['id'] ?? '') });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      res.status(404).json({ error: 'BOOKING_NOT_FOUND', message: err.message });
    } else if (err instanceof BookingAlreadyCancelledError) {
      res.status(409).json({ error: 'BOOKING_ALREADY_CANCELLED', message: err.message });
    } else {
      throw err;
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
}
