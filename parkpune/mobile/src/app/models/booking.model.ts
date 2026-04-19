export type VehicleType = '2w' | '4w';
export type BookingStatus = 'reserved' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  lot_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  start_time: string;
  end_time: string;
  amount_paid: number;
  status: BookingStatus;
  qr_code: string | null;
  razorpay_order_id: string | null;
  created_at: string;
}

export interface BookingCreate {
  lot_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  duration_hours: number;
  user_phone: string;
}

export interface BookingExtend {
  extra_hours: number;
}

export interface ParkedCar {
  lot_id: string;
  lot_name: string;
  lat: number;
  lng: number;
  booking_id: string;
  end_time: string;
  pinned_at: Date;
}
