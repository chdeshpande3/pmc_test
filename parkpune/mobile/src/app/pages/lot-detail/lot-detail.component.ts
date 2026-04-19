import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { interval, Subscription, switchMap, startWith } from 'rxjs';

import { ApiService } from '../../services/api.service';
import { WebSocketService, LotUpdate } from '../../services/websocket.service';
import { ParkingLot, lotColour, totalFree, totalSlots } from '../../models/lot.model';

@Component({
  selector: 'app-lot-detail',
  templateUrl: './lot-detail.component.html',
  styleUrls: ['./lot-detail.component.scss'],
})
export class LotDetailComponent implements OnInit, OnDestroy {
  lot: ParkingLot | null = null;
  loading = true;
  lastUpdated: Date | null = null;

  private pollSub?: Subscription;
  private wsSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private ws: WebSocketService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Poll every 30s as fallback
    this.pollSub = interval(30_000).pipe(
      startWith(0),
      switchMap(() => this.api.getLot(id)),
    ).subscribe({
      next: (lot) => {
        this.lot = lot;
        this.lastUpdated = new Date();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    // WebSocket live updates
    this.wsSub = this.ws.connect().subscribe((update: LotUpdate) => {
      if (!this.lot || update.lot_id !== this.lot.id) return;
      this.lot.free_4w = update.free_4w;
      this.lot.free_2w = update.free_2w;
      this.lot.occupancy_pct = update.occupancy_pct;
      this.lastUpdated = new Date(update.updated_at);
    });
  }

  get colour() { return this.lot ? lotColour(this.lot) : 'green'; }
  get free()   { return this.lot ? totalFree(this.lot) : 0; }
  get total()  { return this.lot ? totalSlots(this.lot) : 0; }

  navigate() {
    if (!this.lot) return;
    this.router.navigate(['/nav', this.lot.id]);
  }

  reserve() {
    if (!this.lot) return;
    this.router.navigate(['/book', this.lot.id]);
  }

  back() { this.router.navigate(['/']); }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.wsSub?.unsubscribe();
  }
}
