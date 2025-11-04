import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IndicatorComponent } from "@components/indicator/indicator.component";

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterOutlet,
    IndicatorComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('common-front');
}
