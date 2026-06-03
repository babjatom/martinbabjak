import { createApp } from './app';
import { seedSlots } from './slots';

const PORT = Number(process.env['PORT'] ?? 3001);

seedSlots();
const app = createApp();

app.listen(PORT, () => {
  console.warn(`Booking API listening on port ${PORT}`);
});
