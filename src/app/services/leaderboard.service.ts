import { HttpClient } from '@angular/common/http';
import { IndicatorService } from './indicator.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LeaderBoardService {
  constructor(
    private http: HttpClient,
    private indicatorSrv: IndicatorService,
  ) {}
}
