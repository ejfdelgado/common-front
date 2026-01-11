import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from 'environments/environment';
import { Observable, Subject } from 'rxjs';

export interface MarkType {
  id: string;
  title: string;
  lat: number;
  lon: number;
};

setOptions({
  key: atob(environment.mapKey),
  v: 'weekly',
  libraries: ["places"],
});

@Component({
  selector: 'app-simple-map',
  standalone: true,
  imports: [],
  templateUrl: './simple-map.html',
  styleUrl: './simple-map.scss',
})
export class SimpleMapComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapElement!: ElementRef;

  map!: google.maps.Map;
  mapLib: any;
  libPromises!: Promise<any>;
  geocoder: any = null;
  markers: any[] = [];

  constructor() {
    this.importLibraries();
  }

  importLibraries() {
    this.libPromises = new Promise(async (resolve, reject) => {
      try {
        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await importLibrary('marker');

        resolve({
          Map,
          AdvancedMarkerElement,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async ngAfterViewInit() {
    try {
      const { Map } = await this.libPromises;

      const mapOptions: google.maps.MapOptions = {
        center: { lat: 0, lng: 0 },
        mapTypeId: "satellite",//roadmap satellite hybrid terrain
        zoom: 8,
        mapId: 'MAP_ID'
      };

      this.map = new Map(this.mapElement.nativeElement, mapOptions);

    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  }

  async getOrCreateGeoDecoder() {
    if (this.geocoder == null) {
      this.geocoder = new google.maps.Geocoder();
    }
    return { geocoder: this.geocoder, google };
  }

  clearOverlays() {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  async addMarker(data: MarkType) {
    const { AdvancedMarkerElement } = await this.libPromises;
    const pinElement = document.createElement('div');
    pinElement.innerHTML = '<b style="color: red;">📍</b>';
    const marker = new AdvancedMarkerElement({
      map: this.map,
      position: { lat: data.lat, lng: data.lon },
      title: data.title,
      content: pinElement,
    });
    const observable = new Subject<MarkType>();
    marker.addListener('click', () => {
      observable.next(data);
    });
    this.markers.push(marker);
    // Center
    this.map.setOptions({
      center: { lat: data.lat, lng: data.lon },
    });
    return observable.asObservable();
  }
}
