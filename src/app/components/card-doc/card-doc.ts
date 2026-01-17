import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { GoogleUser } from '@services/google-auth.service';

@Component({
  selector: 'app-card-doc',
  imports: [
    MatCardModule,
    MatButtonModule,
    ReactiveFormsModule,
    EditableInput,
    MatIcon,
  ],
  templateUrl: './card-doc.html',
  styleUrl: './card-doc.scss',
})
export class CardDoc extends CommonComponent {

  @Input() model: any;
  @Input() user: GoogleUser | null = null;
  @Input() createUpdate!: Function;

  constructor(
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  async openEdit() {
    await this.createUpdate(this.model);
  }

  async share() {

  }
}
