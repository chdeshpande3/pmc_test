import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as mapboxgl from 'mapbox-gl';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { WebSocketService, LotUpdate } from '../../services/websocket.service';
import { LocationService } from '../../services/location.service';
import { ParkingLot } from '../../models/lot.model';

const DEVIATION_THRESHOLD_M = 500;

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
})
export class NavigationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navMap') navMapEl!: ElementRef<HTMLDivElement>;

  lot: ParkingLot | null = null;
  freeSlotsLive = 0;
  loading = true;
  deviated = false;

  private map!: mapboxgl.Map;
  private wsSub?: Subscription;
  private watchId: number | null = null;
  private routeCoords: [number, number][] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private ws: WebSocketService,
    private location: LocationService,
  ) {}

  ngOnInit() {
    (mapboxgl as any).accessToken = environment.mapboxToken;
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getLot(id).subscribe((lot) => {
      this.lot = lot;
      this.freeSlotsLive = lot.free_4w + lot.free_2w;
      this.loading = false;
    });

    this.wsSub = this.ws.connect().subscribe((u: LotUpdate) => {
      if (this.lot && u.lot_id === this.lot.id) {
        this.freeSlotsLive = u.free_4w + u.free_2w;
      }
    });
  }

  ngAfterViewInit() {
    this.map = new mapboxgl.Map({
      container: this.navMapEl.nativeElement,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      zoom: 14,
      center: [73.8567, 18.5204],
    });

    this.map.on('load', () => {
      this.location.getUserLocation().subscribe((coords) => {
        this.map.setCenter([coords.lng, coords.lat]);
        if (this.lot) this.drawRoute(coords.lat, coords.lng, this.lot.lat, this.lot.lng);
      });
    });

    this.watchDeviation();
  }

  private drawRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    if (!this.lot) return;

    new mapboxgl.Marker({ color: '#1565C0' }).setLngLat([fromLng, fromLat]).addTo(this.map);
    new mapboxgl.Marker({ color: '#b71c1c' }).setLngLat([this.lot.lng, this.lot.lat]).addTo(this.map);

    // Straight-line route (real Mapbox Directions API needs a token)
    const coords: [number, number][] = [[fromLng, fromLat], [this.lot.lng, this.lot.lat]];
    this.routeCoords = coords;

    if (!this.map.getSource('route')) {
      this.map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
      this.map.addLayer({ id: 'route', type: 'line', source: 'route',
        paint: { 'line-color': '#1565C0', 'line-width': 5, 'line-opacity': 0.85 } });
    }

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(c => bounds.extend(c));
    this.map.fitBounds(bounds, { padding: 60 });
  }

  private watchDeviation() {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition((pos) => {
      if (!this.lot) return;
      const d = this.location.distanceMetres(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { lat: this.lot.lat, lng: this.lot.lng }
      );
      // Deviation: user moved >500m off expected path
      if (this.routeCoords.length && d > DEVIATION_THRESHOLD_M * 3) {
        this.deviated = true;
      }
    });
  }

  openMapsNavigation() {
    if (!this.lot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.lot.lat},${this.lot.lng}&travelmode=driving`;
    window.open(url, '_blank');
  }

  back() { this.router.navigate(['/lot', this.lot?.id]); }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.map?.remove();
  }
}
