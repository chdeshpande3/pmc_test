import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Router } from '@angular/router';
import { ParkingLot } from '../../../models/lot.model';

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
})
export class BottomSheetComponent {
  lots: ParkingLot[];

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) data: { lots: ParkingLot[] },
    private ref: MatBottomSheetRef,
    private router: Router,
  ) {
    this.lots = data.lots;
  }

  goToLot(lot: ParkingLot) {
    this.ref.dismiss();
    this.router.navigate(['/lot', lot.id]);
  }
}
