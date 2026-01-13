import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-statusbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './statusbar.html',
  styleUrl: './statusbar.scss',
})
export class Statusbar {
  @Input() iconSmall: boolean = true;
}
