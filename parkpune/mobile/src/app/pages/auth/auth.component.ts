import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  step: 'phone' | 'otp' = 'phone';
  submitting = false;

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  get phone() { return this.phoneForm.value.phone ?? ''; }

  sendOtp() {
    if (this.phoneForm.invalid) return;
    this.submitting = true;
    this.auth.requestOtp('+91' + this.phone).subscribe({
      next: () => {
        this.step = 'otp';
        this.submitting = false;
        this.snack.open('OTP sent via WhatsApp', 'OK', { duration: 3000 });
      },
      error: () => {
        this.submitting = false;
        this.snack.open('Failed to send OTP. Try again.', '', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  verifyOtp() {
    if (this.otpForm.invalid) return;
    this.submitting = true;
    this.auth.verifyOtp('+91' + this.phone, this.otpForm.value.otp!).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.open('Welcome to ParkPune!', '', { duration: 2000, panelClass: 'snack-success' });
        this.router.navigate(['/']);
      },
      error: () => {
        this.submitting = false;
        this.snack.open('Invalid or expired OTP', '', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }
}
