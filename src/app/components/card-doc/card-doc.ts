import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';

@Component({
  selector: 'app-card-doc',
  imports: [
    MatCardModule,
    MatButtonModule,
    ReactiveFormsModule,
    EditableInput,
  ],
  templateUrl: './card-doc.html',
  styleUrl: './card-doc.scss',
})
export class CardDoc {
  form = new FormGroup({
    title: new FormControl('Shiba Inu'),
    subtitle: new FormControl('Dog Breed'),
    content: new FormControl('Hello <b>world</b> <i>Angular</i> The Shiba Inu is the smallest of the six original and distinct spitz breeds of dog from Japan. A small, agile dog that copes very well with mountainous terrain, the Shiba Inu was originally bred for hunting.'),
  });
}
