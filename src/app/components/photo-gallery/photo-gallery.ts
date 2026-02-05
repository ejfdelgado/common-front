import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { getBucketFilePath, getSquarePath, getThumbnailPath } from '@tools/BucketPaths';
import { ImageGalleryType } from 'types/fieldsTypes';
import { ImageTypeData } from 'types/ImageTypes';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './photo-gallery.html',
  styleUrl: './photo-gallery.scss',
})
export class PhotoGallery extends CommonComponent {

  index: number = 0;
  _gallery: ImageGalleryType[] = [];
  img0: ImageGalleryType | null = null;
  img1: ImageGalleryType | null = null;
  img2: ImageGalleryType | null = null;
  visible: boolean = false;

  @Input() mode: "full" | "embedded" = "embedded";
  @Input() height: number = 400;
  @Input() thumbnailType: ImageTypeData = "thumbnail";
  @Input()
  set gallery(value: ImageGalleryType[]) {
    this._gallery = value;
    this.gotTo(0);
  }
  get gallery() {
    return this._gallery;
  }

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  forward() {
    this.gotTo(this.index + 1);
  }

  backward() {
    this.gotTo(this.index - 1);
  }

  gotTo(i: number) {
    const size = this._gallery.length;
    let index = Math.max(0, Math.min(i, size - 1));
    this.img0 = null;
    this.img1 = null;
    this.img2 = null;

    this.index = index;
    if (size == 0) {
      return;
    }
    this.img1 = this._gallery[index];
    // Check if it has at left
    if (index > 0) {
      this.img2 = this._gallery[index - 1];
    }
    // Check if it has at right
    if (index < size - 2) {
      this.img2 = this._gallery[index + 1];
    }
  }

  getThumbnailPhoto(item: ImageGalleryType) {
    if (this.thumbnailType == "square") {
      return getBucketFilePath(getSquarePath(item.image));
    } else {
      return getBucketFilePath(getThumbnailPath(item.image));
    }
  }

  getPhoto(item: ImageGalleryType | null) {
    return getBucketFilePath(item?.image ? item.image : null);
  }

  destroyGallery() {
    this.visible = false;
  }

  show() {
    this.visible = true;
  }
}
