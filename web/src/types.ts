export interface Slot {
  id: string;
  label: string;
  starts_at: string;
  duration_m: number;
  is_active: number;
}

export interface PageConfig {
  title: string;
  description: string;
  bg_image_url: string;
}

export interface Booking {
  id: string;
  slot_id: string;
  user_id: string;
  idempotency_key: string;
  status: 'active' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
}
