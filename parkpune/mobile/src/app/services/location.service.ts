import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Coords { lat: number; lng: number; }

// Pune city centre as fallback
const PUNE_CENTRE: Coords = { lat: 18.5204, lng: 73.8567 };

@Injectable({ providedIn: 'root' })
export class LocationService {
  getUserLocation(): Observable<Coords> {
    if (!navigator.geolocation) return of(PUNE_CENTRE);

    return from(
      new Promise<Coords>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          ()    => resolve(PUNE_CENTRE),
          { timeout: 8000, maximumAge: 60_000 }
        )
      )
    ).pipe(catchError(() => of(PUNE_CENTRE)));
  }

  distanceMetres(a: Coords, b: Coords): number {
    const R = 6371e3;
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
    const x = Math.sin(Δφ / 2) ** 2 +
               Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
}
