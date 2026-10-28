import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { IndicatorService } from './indicator.service';

export interface GeoLocationData {
  ip: string;
  readable: string;
  continent: {
    code: string;
    name: string;
  };
  country: {
    code: string;
    name: string;
  };
  subdivisions: [
    {
      code: any;
      name: string;
    },
  ];
  city: string;
  postalCode: any;
  location: {
    latitude: number;
    longitude: number;
    accuracyRadiusKm: any;
    timeZone: any;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GeoLocationService {
  constructor(
    private http: HttpClient,
    private indicatorSrv: IndicatorService,
  ) {}

  async getUserLocation(): Promise<GeoLocationData | null> {
    const indicator = this.indicatorSrv.start();
    try {
      let root = environment.apiUrl;
      //root = 'https://share.pais.tv/';
      const temp = await firstValueFrom(this.http.get<ApiResponse>(`${root}public/geoip`));
      if (temp.success) {
        // Compute readable
        let readable: string[] = [];
        if (temp.data.city) {
          readable.push('City: ' + temp.data.city);
        }
        if (temp.data.subdivisions) {
          temp.data.subdivisions.forEach((sub: any) => {
            readable.push('Sub: ' + sub.name);
          });
        }
        if (temp.data.country) {
          readable.push('Country: ' + temp.data.country.name);
        }
        temp.data.readable = readable.join(', ');
        return temp.data;
      } else {
        return null;
      }
    } catch (err) {
      return null;
    } finally {
      indicator.done();
    }
  }
}
