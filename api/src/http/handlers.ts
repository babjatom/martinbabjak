import { z } from 'zod';
import {
  createBooking,
  getBooking,
  cancelBooking,
  SlotAlreadyBookedError,
  SlotNotFoundError,
  BookingNotFoundError,
  BookingAlreadyCancelledError,
} from '../bookings';
import { listAvailableSlots, listAllSlots, createSlot, deactivateSlot } from '../slots';
import { getConfig, updateConfig } from '../config';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'SLOT_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'SLOT_ALREADY_BOOKED'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'INTERNAL_ERROR';

export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

function validationError(details: unknown): ApiResponse {
  return { status: 400, body: { error: 'VALIDATION_ERROR' as const, details } };
}

function notFound(code: 'SLOT_NOT_FOUND' | 'BOOKING_NOT_FOUND', message: string): ApiResponse {
  return { status: 404, body: { error: code, message } };
}

function conflict(code: 'SLOT_ALREADY_BOOKED' | 'BOOKING_ALREADY_CANCELLED', message: string): ApiResponse {
  return { status: 409, body: { error: code, message } };
}

export async function handleGetConfig(): Promise<ApiResponse> {
  return { status: 200, body: { config: await getConfig() } };
}

const UpdateConfigSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  bg_image_url: z.string().max(2000).optional(),
});

export async function handlePutConfig(body: unknown): Promise<ApiResponse> {
  const parsed = UpdateConfigSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());
  return { status: 200, body: { config: await updateConfig(parsed.data) } };
}

export async function handleGetSlots(): Promise<ApiResponse> {
  return { status: 200, body: { slots: await listAvailableSlots() } };
}

export async function handleGetSlotsAll(): Promise<ApiResponse> {
  return { status: 200, body: { slots: await listAllSlots() } };
}

const CreateSlotSchema = z.object({
  label: z.string().min(1).max(200),
  starts_at: z.string().datetime(),
  duration_m: z.number().int().positive().max(480).optional(),
});

export async function handlePostSlots(body: unknown): Promise<ApiResponse> {
  const parsed = CreateSlotSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());
  const slot = await createSlot(parsed.data);
  return { status: 201, body: { slot } };
}

export async function handleDeleteSlot(id: string): Promise<ApiResponse> {
  try {
    await deactivateSlot(id);
    return { status: 200, body: { message: 'Slot deactivated' } };
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      return notFound('SLOT_NOT_FOUND', err.message);
    }
    throw err;
  }
}

const CreateBookingSchema = z.object({
  slot_id: z.string().min(1),
  user_id: z.string().min(1),
  idempotency_key: z.string().min(1),
});

export async function handlePostBookings(body: unknown): Promise<ApiResponse> {
  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten());

  try {
    const { booking, created } = await createBooking(parsed.data);
    return { status: created ? 201 : 200, body: { booking } };
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      return notFound('SLOT_NOT_FOUND', err.message);
    }
    if (err instanceof SlotAlreadyBookedError) {
      return conflict('SLOT_ALREADY_BOOKED', err.message);
    }
    throw err;
  }
}

export async function handleGetBooking(id: string): Promise<ApiResponse> {
  try {
    return { status: 200, body: { booking: await getBooking(id) } };
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return notFound('BOOKING_NOT_FOUND', err.message);
    }
    throw err;
  }
}

export async function handleDeleteBooking(id: string): Promise<ApiResponse> {
  try {
    return { status: 200, body: { booking: await cancelBooking(id) } };
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return notFound('BOOKING_NOT_FOUND', err.message);
    }
    if (err instanceof BookingAlreadyCancelledError) {
      return conflict('BOOKING_ALREADY_CANCELLED', err.message);
    }
    throw err;
  }
}

export function internalError(): ApiResponse {
  return {
    status: 500,
    body: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  };
}
