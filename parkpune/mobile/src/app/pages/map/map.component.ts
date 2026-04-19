import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Subscription } from 'rxjs';
import * as mapboxgl from 'mapbox-gl';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { WebSocketService, LotUpdate } from '../../services/websocket.service';
import { LocationService, Coords } from '../../services/location.service';
import { ParkingLot, lotColour } from '../../models/lot.model';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  map!: mapboxgl.Map;
  lots: ParkingLot[] = [];
  nearbyLots: ParkingLot[] = [];
  userLocation: Coords | null = null;
  loading = true;

  private markers = new Map<string, mapboxgl.Marker>();
  private userMarker: mapboxgl.Marker | null = null;
  private wsSub?: Subscription;

  constructor(
    private api: ApiService,
    private ws: WebSocketService,
    private location: LocationService,
    private bottomSheet: MatBottomSheet,
    private router: Router,
  ) {}

  ngOnInit() {
    (mapboxgl as any).accessToken = environment.mapboxToken;
  }

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [73.8567, 18.5204],   // Pune centre
      zoom: 12,
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'top-right',
    );

    this.map.on('load', () => {
      this.loadLots();
      this.getUserLocation();
    });
  }

  private loadLots() {
    this.api.getLots().subscribe({
      next: (lots) => {
        this.lots = lots;
        this.loading = false;
        this.renderMarkers();
        this.subscribeWS();
      },
      error: () => {
        this.loading = false;
        this.loadCachedLots();
      },
    });
  }

  private loadCachedLots() {
    const raw = localStorage.getItem('cached_lots');
    if (raw) {
      this.lots = JSON.parse(raw);
      this.renderMarkers();
    }
  }

  private renderMarkers() {
    localStorage.setItem('cached_lots', JSON.stringify(this.lots));

    this.lots.forEach((lot) => {
      if (this.markers.has(lot.id)) {
        this.updateMarkerColour(lot);
        return;
      }

      const el = document.createElement('div');
      el.className = `lot-marker ${lotColour(lot)}`;
      el.title = lot.name;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lot.lng, lot.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${lot.name}</strong><br>
             Free: ${lot.free_4w + lot.free_2w} / ${lot.total_4w + lot.total_2w}<br>
             <a href="/lot/${lot.id}" onclick="event.preventDefault();
               window.angularRouter && window.angularRouter.navigate(['/lot/${lot.id}'])">
               View details →</a>`
          )
        )
        .addTo(this.map);

      el.addEventListener('click', () => this.router.navigate(['/lot', lot.id]));
      this.markers.set(lot.id, marker);
    });
  }

  private updateMarkerColour(lot: ParkingLot) {
    const marker = this.markers.get(lot.id);
    if (!marker) return;
    const el = marker.getElement();
    el.className = `lot-marker ${lotColour(lot)}`;
  }

  private getUserLocation() {
    this.location.getUserLocation().subscribe((coords) => {
      this.userLocation = coords;
      this.map.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });
      this.loadNearbyLots(coords);

      if (!this.userMarker) {
        this.userMarker = new mapboxgl.Marker({ color: '#1565C0' })
          .setLngLat([coords.lng, coords.lat])
          .addTo(this.map);
      }

      // Draw 1km radius circle
      if (this.map.getLayer('radius-layer')) return;
      this.map.addSource('user-radius', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }, properties: {} },
      });
      this.map.addLayer({
        id: 'radius-layer',
        type: 'circle',
        source: 'user-radius',
        paint: {
          'circle-radius': { stops: [[12, 80], [14, 180], [16, 350]], base: 2 },
          'circle-color': '#1565C0',
          'circle-opacity': 0.08,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1565C0',
          'circle-stroke-opacity': 0.4,
        },
      });
    });
  }

  private loadNearbyLots(coords: Coords) {
    this.api.getNearbyLots(coords.lat, coords.lng, 1000).subscribe((lots) => {
      this.nearbyLots = lots.slice(0, 3);
      if (this.nearbyLots.length) {
        this.bottomSheet.open(BottomSheetComponent, {
          data: { lots: this.nearbyLots },
          hasBackdrop: false,
          panClass: 'bottom-sheet-container',
        });
      }
    });
  }

  private subscribeWS() {
    this.wsSub = this.ws.connect().subscribe((update: LotUpdate) => {
      const lot = this.lots.find((l) => l.id === update.lot_id);
      if (!lot) return;
      lot.free_4w = update.free_4w;
      lot.free_2w = update.free_2w;
      lot.occupancy_pct = update.occupancy_pct;
      lot.last_updated = new Date(update.updated_at);
      this.updateMarkerColour(lot);
    });
  }

  openBottomSheet() {
    this.bottomSheet.open(BottomSheetComponent, {
      data: { lots: this.nearbyLots.length ? this.nearbyLots : this.lots.slice(0, 3) },
      hasBackdrop: false,
      panClass: 'bottom-sheet-container',
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.map?.remove();
  }
}
