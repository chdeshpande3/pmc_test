import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { LocationService } from '../../services/location.service';
import { ParkedCar } from '../../models/booking.model';

const PINNED_CAR_KEY = 'pp_pinned_car';

@Component({
  selector: 'app-my-car',
  templateUrl: './my-car.component.html',
  styleUrls: ['./my-car.component.scss'],
})
export class MyCarComponent implements OnInit {
  pinnedCar: ParkedCar | null = null;
  timeRemaining = '';
  private timerRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private location: LocationService,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const raw = localStorage.getItem(PINNED_CAR_KEY);
    if (raw) {
      this.pinnedCar = JSON.parse(raw);
      this.startTimer();
    }
  }

  pinHere() {
    this.location.getUserLocation().subscribe((coords) => {
      const stored = localStorage.getItem('pp_last_booking');
      const lastBooking = stored ? JSON.parse(stored) : null;

      if (!lastBooking) {
        this.snack.open('No active booking found.', '', { duration: 3000 });
        return;
      }

      const car: ParkedCar = {
        lot_id:     lastBooking.lot_id,
        lot_name:   lastBooking.lot_name ?? 'Parking lot',
        lat:        coords.lat,
        lng:        coords.lng,
        booking_id: lastBooking.id,
        end_time:   lastBooking.end_time,
        pinned_at:  new Date(),
      };

      localStorage.setItem(PINNED_CAR_KEY, JSON.stringify(car));
      this.pinnedCar = car;
      this.startTimer();
      this.snack.open('Car location pinned!', '', { duration: 2000, panelClass: 'snack-success' });
    });
  }

  navigateToCar() {
    if (!this.pinnedCar) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.pinnedCar.lat},${this.pinnedCar.lng}&travelmode=walking`;
    window.open(url, '_blank');
  }

  extendParking(extraHours: number) {
    if (!this.pinnedCar) return;
    this.api.extendBooking(this.pinnedCar.booking_id, { extra_hours: extraHours }).subscribe({
      next: (b) => {
        const updated = { ...this.pinnedCar!, end_time: b.end_time };
        this.pinnedCar = updated;
        localStorage.setItem(PINNED_CAR_KEY, JSON.stringify(updated));
        this.snack.open(`Extended by ${extraHours}hr. New end: ${new Date(b.end_time).toLocaleTimeString()}`, '', {
          duration: 4000, panelClass: 'snack-success',
        });
      },
      error: () => this.snack.open('Could not extend parking.', '', { duration: 3000, panelClass: 'snack-error' }),
    });
  }

  clearPin() {
    localStorage.removeItem(PINNED_CAR_KEY);
    this.pinnedCar = null;
    if (this.timerRef) clearInterval(this.timerRef);
    this.timerRef = null;
  }

  private startTimer() {
    this.updateTimer();
    this.timerRef = setInterval(() => this.updateTimer(), 30_000);
  }

  private updateTimer() {
    if (!this.pinnedCar?.end_time) return;
    const diff = new Date(this.pinnedCar.end_time).getTime() - Date.now();
    if (diff <= 0) { this.timeRemaining = 'Expired'; return; }
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    this.timeRemaining = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  ngOnDestroy() { if (this.timerRef) clearInterval(this.timerRef); }
}
