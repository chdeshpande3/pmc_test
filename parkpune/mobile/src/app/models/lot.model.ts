export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  total_4w: number;
  total_2w: number;
  free_4w: number;
  free_2w: number;
  rate_4w: number;    // ₹ per hour
  rate_2w: number;    // ₹ per hour
  operating_hours: string;
  is_active: boolean;
  occupancy_pct: number;  // 0-100
  created_at: string;
  // client-side helpers
  distance_m?: number;
  last_updated?: Date;
}

export type LotColour = 'green' | 'amber' | 'red';

export function lotColour(lot: ParkingLot): LotColour {
  if (lot.occupancy_pct < 50) return 'green';
  if (lot.occupancy_pct < 80) return 'amber';
  return 'red';
}

export function totalFree(lot: ParkingLot): number {
  return lot.free_4w + lot.free_2w;
}

export function totalSlots(lot: ParkingLot): number {
  return lot.total_4w + lot.total_2w;
}
