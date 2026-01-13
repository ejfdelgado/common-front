import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-card-doc',
  imports: [
    MatCardModule,
    MatButtonModule,
  ],
  templateUrl: './card-doc.html',
  styleUrl: './card-doc.scss',
})
export class CardDoc {

}
