import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ParkingLot, lotColour, totalFree, totalSlots } from '../../../models/lot.model';

@Component({
  selector: 'app-lot-card',
  templateUrl: './lot-card.component.html',
  styleUrls: ['./lot-card.component.scss'],
})
export class LotCardComponent {
  @Input() lot!: ParkingLot;
  @Output() selected = new EventEmitter<ParkingLot>();

  get colour() { return lotColour(this.lot); }
  get free()   { return totalFree(this.lot); }
  get total()  { return totalSlots(this.lot); }
  get distStr() {
    if (!this.lot.distance_m) return '';
    return this.lot.distance_m < 1000
      ? `${Math.round(this.lot.distance_m)}m away`
      : `${(this.lot.distance_m / 1000).toFixed(1)}km away`;
  }
}
