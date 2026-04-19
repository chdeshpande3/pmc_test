import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ParkingLot } from '../../models/lot.model';
import { Booking } from '../../models/booking.model';
import { environment } from '../../../environments/environment';

declare const Razorpay: any;

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss'],
})
export class BookingComponent implements OnInit {
  lot: ParkingLot | null = null;
  booking: Booking | null = null;
  loading = true;
  submitting = false;
  paymentDone = false;

  form = this.fb.group({
    vehicle_number: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/)]],
    vehicle_type:   ['4w', Validators.required],
    duration_hours: [2,   [Validators.required, Validators.min(1), Validators.max(24)]],
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getLot(id).subscribe((lot) => {
      this.lot = lot;
      this.loading = false;
    });
  }

  get estimatedAmount(): number {
    if (!this.lot) return 0;
    const type    = this.form.value.vehicle_type as '2w' | '4w';
    const hours   = this.form.value.duration_hours ?? 1;
    const rate    = type === '2w' ? this.lot.rate_2w : this.lot.rate_4w;
    return rate * hours;
  }

  submit() {
    if (!this.lot || this.form.invalid || !this.auth.currentUser) return;
    this.submitting = true;

    const payload = {
      lot_id: this.lot.id,
      vehicle_number: (this.form.value.vehicle_number ?? '').toUpperCase(),
      vehicle_type: this.form.value.vehicle_type as '2w' | '4w',
      duration_hours: this.form.value.duration_hours ?? 2,
      user_phone: this.auth.currentUser.phone,
    };

    this.api.createBooking(payload).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.submitting = false;
        this.initiateRazorpay(booking);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.detail ?? 'Booking failed. Try again.';
        this.snack.open(msg, '', { duration: 4000, panelClass: 'snack-error' });
      },
    });
  }

  private initiateRazorpay(booking: Booking) {
    const options = {
      key: environment.razorpayKeyId,
      amount: Math.round(Number(booking.amount_paid) * 100), // paise
      currency: 'INR',
      name: 'ParkPune',
      description: `Parking at ${this.lot?.name}`,
      order_id: booking.razorpay_order_id,
      handler: () => {
        this.paymentDone = true;
        this.snack.open('Payment successful! Check WhatsApp for confirmation.', '', {
          duration: 5000, panelClass: 'snack-success',
        });
      },
      prefill: {
        contact: this.auth.currentUser?.phone ?? '',
      },
      theme: { color: '#1565C0' },
      modal: {
        ondismiss: () => {
          if (!this.paymentDone) {
            this.snack.open('Payment cancelled. Your slot is held for 5 minutes.', '', { duration: 4000 });
          }
        },
      },
    };

    if (typeof Razorpay !== 'undefined') {
      new Razorpay(options).open();
    } else {
      // Fallback: UPI deep link
      const upiUrl = `upi://pay?pa=parkpune@upi&pn=ParkPune&am=${booking.amount_paid}&cu=INR&tn=Parking+${this.lot?.name}`;
      window.location.href = upiUrl;
    }
  }

  goHome() { this.router.navigate(['/']); }
}
