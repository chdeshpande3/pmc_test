import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LotUpdate {
  type: 'lot_update';
  lot_id: string;
  free_4w: number;
  free_2w: number;
  total_4w: number;
  total_2w: number;
  occupancy_pct: number;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private updates$ = new Subject<LotUpdate>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(): Observable<LotUpdate> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.updates$.asObservable();
    }

    this.ws = new WebSocket(environment.wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] connected');
      this.pingInterval = setInterval(() => this.ws?.send('ping'), 25_000);
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'lot_update') {
          this.updates$.next(msg as LotUpdate);
        }
      } catch { /* ignore non-JSON */ }
    };

    this.ws.onclose = () => {
      console.log('[WS] closed, reconnecting in 5s…');
      if (this.pingInterval) clearInterval(this.pingInterval);
      setTimeout(() => this.connect(), 5_000);
    };

    this.ws.onerror = (err) => console.error('[WS] error', err);

    return this.updates$.asObservable();
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
  }

  ngOnDestroy() { this.disconnect(); }
}
