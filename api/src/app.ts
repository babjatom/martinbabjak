import express from 'express';
import { router, errorHandler } from './routes';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use(errorHandler as express.ErrorRequestHandler);
  return app;
}
