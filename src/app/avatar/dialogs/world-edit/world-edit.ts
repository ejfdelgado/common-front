import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { WorldAvatar } from 'src/types/WorldAvatar';
import { Subscription } from 'rxjs';
import { OnOffToggleComponent } from 'src/app/components/fields/on-off-toggle/on-off-toggle';

@Component({
  selector: 'app-world-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    OnOffToggleComponent,
  ],
  templateUrl: './world-edit.html',
  styleUrl: './world-edit.scss',
})
export class WorldEditComponent {
  private keydownSub: Subscription;
  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WorldEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorldAvatar,
  ) {
    this.generalForm = this.fb.group({
      useLivePeer: [!!data.config.useLivePeer],
      useVoice: [!!data.config.useVoice],
    });
    this.keydownSub = this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.data.config.useLivePeer = this.generalForm.value.useLivePeer;
    this.data.config.useVoice = this.generalForm.value.useVoice;

    this.dialogRef.close(this.data);
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
