import { Component, ElementRef, ViewChild, AfterViewInit, Input } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from 'environments/environment';
import { Subject } from 'rxjs';

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

  @Input() transform?: (a: MarkType) => Promise<string>;

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
        center: { lat: 6.6062575, lng: -73.0541827 },
        mapTypeId: "satellite",//roadmap satellite hybrid terrain
        zoom: 21,
        mapId: 'MAP_ID',
        disableDefaultUI: true,
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
    const config: any = {
      map: this.map,
      position: { lat: data.lat, lng: data.lon },
      title: data.title,
    };

    if (this.transform) {
      const pinElement = document.createElement('div');
      pinElement.innerHTML = await this.transform(data);
      config.content = pinElement;
    }

    const marker = new AdvancedMarkerElement(config);
    const observable = new Subject<MarkType>();
    marker.addListener('click', () => {
      observable.next(data);
    });
    this.markers.push(marker);
    // Center
    this.center(data.lat, data.lon);
    return observable.asObservable();
  }

  center(lat: number, lon: number) {
    this.map.setOptions({
      center: { lat: lat, lng: lon },
    });
  }
}
