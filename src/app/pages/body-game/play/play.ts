import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { MenuOptionType } from '@mytypes/StatusBar';

@Component({
  selector: 'app-play',
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu
  ],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class PlayComponent {
  menuOptions: MenuOptionType[] = [];

}
