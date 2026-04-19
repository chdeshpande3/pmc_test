import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent }        from './pages/map/map.component';
import { LotDetailComponent }  from './pages/lot-detail/lot-detail.component';
import { BookingComponent }    from './pages/booking/booking.component';
import { NavigationComponent } from './pages/navigation/navigation.component';
import { AuthComponent }       from './pages/auth/auth.component';
import { MyCarComponent }      from './pages/my-car/my-car.component';
import { AuthGuard }           from './guards/auth.guard';

const routes: Routes = [
  { path: '',           component: MapComponent },
  { path: 'auth',       component: AuthComponent },
  { path: 'lot/:id',    component: LotDetailComponent },
  { path: 'book/:id',   component: BookingComponent, canActivate: [AuthGuard] },
  { path: 'nav/:id',    component: NavigationComponent },
  { path: 'my-car',     component: MyCarComponent, canActivate: [AuthGuard] },
  { path: '**',         redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
