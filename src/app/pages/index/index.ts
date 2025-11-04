import { Component } from '@angular/core';
import { IndicatorService } from "@services/indicator.service";

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index {
  constructor(
    private indicatorSrv: IndicatorService,
  ) {

  }
}
