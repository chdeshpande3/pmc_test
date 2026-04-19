import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material
import { MatToolbarModule }    from '@angular/material/toolbar';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatCardModule }       from '@angular/material/card';
import { MatInputModule }      from '@angular/material/input';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatSelectModule }     from '@angular/material/select';
import { MatDialogModule }     from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatSnackBarModule }   from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule }      from '@angular/material/chips';
import { MatDividerModule }    from '@angular/material/divider';
import { MatListModule }       from '@angular/material/list';
import { MatBadgeModule }      from '@angular/material/badge';
import { MatTabsModule }       from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule }     from '@angular/material/core';
import { MatStepperModule }    from '@angular/material/stepper';
import { MatRadioModule }      from '@angular/material/radio';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';

// Pages
import { MapComponent }        from './pages/map/map.component';
import { LotDetailComponent }  from './pages/lot-detail/lot-detail.component';
import { BookingComponent }    from './pages/booking/booking.component';
import { NavigationComponent } from './pages/navigation/navigation.component';
import { AuthComponent }       from './pages/auth/auth.component';
import { MyCarComponent }      from './pages/my-car/my-car.component';

// Shared
import { LotCardComponent }    from './shared/components/lot-card/lot-card.component';
import { BottomSheetComponent } from './shared/components/bottom-sheet/bottom-sheet.component';
import { TimeAgoPipe }         from './shared/pipes/time-ago.pipe';
import { InrPipe }             from './shared/pipes/inr.pipe';

// Interceptor
import { AuthInterceptor }     from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    LotDetailComponent,
    BookingComponent,
    NavigationComponent,
    AuthComponent,
    MyCarComponent,
    LotCardComponent,
    BottomSheetComponent,
    TimeAgoPipe,
    InrPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDialogModule,
    MatBottomSheetModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatChipsModule, MatDividerModule, MatListModule, MatBadgeModule,
    MatTabsModule, MatProgressBarModule, MatRippleModule, MatStepperModule,
    MatRadioModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
