import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SearchInputComponent } from '@components/search-input/search-input';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AlterEgoService } from '@services/alterego.service';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';
import { MenuOptionType } from 'types/StatusBar';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
    SearchInputComponent,
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AlterEgoMain extends AuthenticatedComponent implements OnInit, OnDestroy {
  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public alterEgoSrv: AlterEgoService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {

  }

  async initializeWorker() {
    const mockData = [
      { id: '1', title: 'How to bake a chocolate cake', url: "" },
      { id: '2', title: 'The history of Rome', url: "" },
      { id: '3', title: 'Python programming for beginners', url: "" }
    ];
    const response = await this.alterEgoSrv.initializeWorker(mockData);
    console.log(JSON.stringify(response));
  }

  async initialize() {
    const mockData = [
      { id: '1', title: 'How to bake a chocolate cake', url: "" },
      { id: '2', title: 'The history of Rome', url: "" },
      { id: '3', title: 'Python programming for beginners', url: "" }
    ];
    const response = await this.alterEgoSrv.initialize(mockData);
    console.log(JSON.stringify(response));
  }

  async search() {
    const response = await this.alterEgoSrv.search('cooking recipes');
    console.log(JSON.stringify(response));
  }

  async searchWorker() {
    const response = await this.alterEgoSrv.searchWorker('cooking recipes');
    console.log(JSON.stringify(response));
  }

  async echo() {
    const response = await this.alterEgoSrv.echo();
    console.log(JSON.stringify(response));
  }
}
