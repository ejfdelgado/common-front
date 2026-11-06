import { AfterViewInit, Component, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
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
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    TranslatePipe,
    AsyncPipe,
    PhotoGallery,
  ],
  templateUrl: './avatar-edit.html',
  styleUrl: './avatar-edit.scss',
})
export class AvatarEditComponent implements AfterViewInit, OnDestroy {
  @ViewChild(PhotoGallery) photoGallery?: PhotoGallery;
  private keydownSub: Subscription;
  gallery: ImageGalleryType[] = [];
  selectedMeshPath: string | null;

  constructor(
    private dialogRef: MatDialogRef<AvatarEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AvatarModel,
  ) {
    this.selectedMeshPath = data.meshPath ?? null;
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

  ngAfterViewInit(): void {
    // Preselect the current mesh; deferred to avoid ExpressionChangedAfterItHasBeenChecked
    const initial = this.data.meshPath;
    if (initial) {
      setTimeout(() => this.photoGallery?.gotToId(initial));
    }
  }

  save(): void {
    this.data.meshPath = this.selectedMeshPath ?? undefined;
    this.dialogRef.close(this.data);
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  selectItem(item: ImageGalleryType) {
    this.selectedMeshPath = item.id;
  }
}
