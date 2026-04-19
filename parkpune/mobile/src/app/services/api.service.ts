import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ParkingLot } from '../models/lot.model';
import { Booking, BookingCreate, BookingExtend } from '../models/booking.model';
import { AuthToken, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Lots ────────────────────────────────────────────────────────────────────
  getLots(): Observable<ParkingLot[]> {
    return this.http.get<ParkingLot[]>(`${this.base}/lots`);
  }

  getNearbyLots(lat: number, lng: number, radius = 1000): Observable<ParkingLot[]> {
    const params = new HttpParams()
      .set('lat', lat)
      .set('lng', lng)
      .set('radius', radius);
    return this.http.get<ParkingLot[]>(`${this.base}/lots/nearby`, { params });
  }

  getLot(id: string): Observable<ParkingLot> {
    return this.http.get<ParkingLot>(`${this.base}/lots/${id}`);
  }

  // ── Bookings ────────────────────────────────────────────────────────────────
  createBooking(payload: BookingCreate): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/bookings`, payload);
  }

  getBooking(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/bookings/${id}`);
  }

  extendBooking(id: string, payload: BookingExtend): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/bookings/${id}/extend`, payload);
  }

  completeBooking(id: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/bookings/${id}/complete`, {});
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/bookings/${id}/cancel`, {});
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  requestOtp(phone: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/users/request-otp`, { phone });
  }

  verifyOtp(phone: string, otp: string): Observable<AuthToken> {
    return this.http.post<AuthToken>(`${this.base}/users/verify-otp`, { phone, otp });
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.base}/users/me`);
  }
}
