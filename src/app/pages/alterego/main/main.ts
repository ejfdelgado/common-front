import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AlterEgoMain extends AuthenticatedComponent implements OnInit, OnDestroy {
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
}
