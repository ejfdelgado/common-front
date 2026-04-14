import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { MenuOptionType } from '@mytypes/StatusBar';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { BodyTracker } from './components/body-tracker/body-tracker';

@Component({
  selector: 'app-play',
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    BodyTracker,
  ],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class PlayComponent extends AuthenticatedComponent implements OnInit, OnDestroy {

  menuOptions: MenuOptionType[] = [];

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    //
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }



}
