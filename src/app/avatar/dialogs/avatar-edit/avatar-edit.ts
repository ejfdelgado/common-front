import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { AvatarModel } from 'src/types/WorldAvatar';
import { MESH_OPTIONS, MESH_PREVIEW } from 'src/types/WorldAvatarLibrary';
import { Subscription } from 'rxjs';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { AsyncPipe } from '@angular/common';
import { PhotoGallery } from 'src/app/components/photo-gallery/photo-gallery';
import { ImageGalleryType } from 'src/types/fieldsTypes';

@Component({
  selector: 'app-avatar-edit',
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
    TranslatePipe,
    AsyncPipe,
    PhotoGallery,
  ],
  templateUrl: './avatar-edit.html',
  styleUrl: './avatar-edit.scss',
})
export class AvatarEditComponent {
  private keydownSub: Subscription;
  readonly meshOptions = MESH_OPTIONS;
  generalForm: FormGroup;
  gallery: ImageGalleryType[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AvatarEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AvatarModel,
  ) {
    this.generalForm = this.fb.group({
      meshPath: [data.meshPath ?? null],
    });
    this.keydownSub = this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
    //Build the gallery
    for (let option of MESH_OPTIONS) {
      this.gallery.push({
        id: option.value,
        image: MESH_PREVIEW[option.value],
        description: option.label,
      });
      
    }
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.data.meshPath = this.generalForm.value.meshPath;

    this.dialogRef.close(this.data);
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
