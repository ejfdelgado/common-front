import { Component } from '@angular/core';
import { IndicatorService } from "@services/indicator.service";
import { GoogleAuthService } from "@services/google-auth.service";

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
    public authSrv: GoogleAuthService
  ) {
    this.authSrv.authState$.subscribe(user => {
      if (user) {
        console.log('Logged in:', user.name);
      } else {
        console.log('Logged out');
      }
    });
  }
}
