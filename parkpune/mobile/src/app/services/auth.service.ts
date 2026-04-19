import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User, AuthToken } from '../models/user.model';

const TOKEN_KEY = 'pp_token';
const USER_KEY  = 'pp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<User | null>(this._loadUser());
  user$ = this._user$.asObservable();

  constructor(private api: ApiService) {}

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  get currentUser(): User | null { return this._user$.value; }
  get isLoggedIn(): boolean { return !!this.token; }

  requestOtp(phone: string) { return this.api.requestOtp(phone); }

  verifyOtp(phone: string, otp: string) {
    return this.api.verifyOtp(phone, otp).pipe(
      tap((res: AuthToken) => {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this._user$.next(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
  }

  private _loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
