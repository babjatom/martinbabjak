import { createApp } from './app';
import { initApiStore } from './runtime/init-store';

const PORT = Number(process.env['PORT'] ?? 3001);

async function main(): Promise<void> {
  await initApiStore();
  const app = createApp();
  app.listen(PORT, () => {
    console.warn(`Booking API listening on port ${PORT}`);
  });
}

void main();
