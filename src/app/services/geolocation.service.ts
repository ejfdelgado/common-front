import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { IndicatorService } from './indicator.service';

@Injectable({
  providedIn: 'root',
})
export class GeoLocationService {
  constructor(
    private http: HttpClient,
    private indicatorSrv: IndicatorService,
  ) {}

  async getUserLocation(): Promise<void> {
    const indicator = this.indicatorSrv.start();
    try {
      const temp = firstValueFrom(this.http.get<ApiResponse>(`${environment.apiUrl}public/geoip`));
      console.log(JSON.stringify(temp, null, 4));
    } catch (err) {
    } finally {
      indicator.done();
    }
  }
}
