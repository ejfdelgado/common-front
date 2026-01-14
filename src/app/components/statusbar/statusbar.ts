import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { GoogleAuthService, GoogleUser } from '@services/google-auth.service';
import { IndicatorService } from '@services/indicator.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-statusbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    CommonModule,
  ],
  templateUrl: './statusbar.html',
  styleUrl: './statusbar.scss',
})
export class Statusbar {
  @Input() iconSmall: boolean = false;
  user: GoogleUser | null = null;

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: GoogleAuthService,
    private http: HttpClient,
    public cdr: ChangeDetectorRef,
  ) {
    this.authSrv.authState$.subscribe(user => {
      this.user = user;
      this.cdr.detectChanges();
    });
  }
}
