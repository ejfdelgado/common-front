import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AlterEgoService, SearchLangsType } from '@services/alterego.service';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';
import { MenuOptionType } from 'types/StatusBar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { SearchInputComponent } from '@components/search-input/search-input';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    SearchInputComponent,
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AlterEgoMain extends AuthenticatedComponent implements OnInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;
  language: SearchLangsType = "es";

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

  toggle() {
    this.sidenav.toggle();
  }

  async initialize() {
    const mockData = [
      { id: '1', title: 'Como cocinar un rollo de canela', url: "" },
      { id: '2', title: 'En la historia de Roma el personaje Constantino es relevante', url: "" },
      { id: '3', title: 'Python es un excelente lenguaje de programacion para IA', url: "" }
    ];
    const response = await this.alterEgoSrv.initialize(mockData, this.language);
    console.log(JSON.stringify(response, null, 4));
  }

  async search() {
    const response = await this.alterEgoSrv.search('Necesito saber de desarrollo de software', this.language);
    console.log(JSON.stringify(response, null, 4));
  }

  async echo() {
    const response = await this.alterEgoSrv.echo();
    console.log(JSON.stringify(response));
  }

  async searchKnowledge(event: any) {

  }
}
