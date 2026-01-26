import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { IndicatorService } from '@services/indicator.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { User } from '@angular/fire/auth';
import { AuthService } from '@services/auth.service';

export interface MenuOptionType {
  label: string;
  icon: string;
  callback: Function,
}

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
  @Input() iconSmall: boolean = true;
  @Input() options: MenuOptionType[] = [];
  @Input() title: string = "";
  user: User | null = null;

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: AuthService,
    private http: HttpClient,
    public cdr: ChangeDetectorRef,
  ) {
    this.authSrv.authState$.subscribe(user => {
      this.user = user;
      try {
        this.cdr.detectChanges();
      } catch (err) { }
    });
  }
}
