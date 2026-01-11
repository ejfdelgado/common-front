import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from 'environments/environment';

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

  private map?: google.maps.Map;

  async ngAfterViewInit() {
    try {
      // 1. Import necessary libraries using the functional API
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;

      // 2. Initialize the map
      const mapOptions: google.maps.MapOptions = {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
        mapId: 'DEMO_MAP_ID' // Required for Advanced Markers
      };

      this.map = new Map(this.mapElement.nativeElement, mapOptions);

      // Example of using setOptions after a delay
      setTimeout(() => {
        this.updateMapTheme();
      }, 3000);

    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  }

  // 3. Using setOptions() to update the map state functionally
  private updateMapTheme() {
    if (this.map) {
      this.map.setOptions({
        zoom: 12,
        center: { lat: 40.7128, lng: -74.0060 }, // Move to NYC
        mapTypeId: 'terrain'
      });
    }
  }
}
