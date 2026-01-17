import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';

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
export class CardDoc extends CommonComponent {

  @Input() model: any;

  form = new FormGroup({
    title: new FormControl('Shiba Inu'),
    subtitle: new FormControl('Dog Breed'),
    content: new FormControl('Hello <b>world</b> <i>Angular</i> The Shiba Inu is the smallest of the six original and distinct spitz breeds of dog from Japan. A small, agile dog that copes very well with mountainous terrain, the Shiba Inu was originally bred for hunting.'),
  });

  constructor(
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }
}
