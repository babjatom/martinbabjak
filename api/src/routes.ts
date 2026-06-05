import { Router, Request, Response, NextFunction } from 'express';
import {
  handleGetConfig,
  handlePutConfig,
  handleGetSlots,
  handleGetSlotsAll,
  handlePostSlots,
  handleDeleteSlot,
  handlePostBookings,
  handleGetBookings,
  handleGetBooking,
  handleDeleteBooking,
  internalError,
} from './http/handlers';

export const router = Router();

async function send(res: Response, promise: Promise<{ status: number; body: Record<string, unknown> }>): Promise<void> {
  const { status, body } = await promise;
  res.status(status).json(body);
}

router.get('/config', (_req: Request, res: Response): void => {
  void send(res, handleGetConfig());
});

router.put('/config', (req: Request, res: Response): void => {
  void send(res, handlePutConfig(req.body));
});

router.get('/slots', (_req: Request, res: Response): void => {
  void send(res, handleGetSlots());
});

router.get('/slots/all', (_req: Request, res: Response): void => {
  void send(res, handleGetSlotsAll());
});

router.post('/slots', (req: Request, res: Response): void => {
  void send(res, handlePostSlots(req.body));
});

router.delete('/slots/:id', (req: Request, res: Response): void => {
  void send(res, handleDeleteSlot(req.params['id'] ?? ''));
});

router.post('/bookings', (req: Request, res: Response): void => {
  void send(res, handlePostBookings(req.body));
});

router.get('/bookings', (_req: Request, res: Response): void => {
  void send(res, handleGetBookings());
});

router.get('/bookings/:id', (req: Request, res: Response): void => {
  void send(res, handleGetBooking(req.params['id'] ?? ''));
});

router.delete('/bookings/:id', (req: Request, res: Response): void => {
  void send(res, handleDeleteBooking(req.params['id'] ?? ''));
});

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  const { status, body } = internalError();
  res.status(status).json(body);
}
