import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { getBucketFilePath, getSquarePath, getThumbnailPath } from '@tools/BucketPaths';
import { ImageGalleryType } from 'types/fieldsTypes';
import { ImageTypeData } from 'types/ImageTypes';

@Component({
  selector: 'app-photo-gallery-simple',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './photo-gallery-simple.html',
  styleUrl: './photo-gallery-simple.scss',
})
export class PhotoGallerySimple extends CommonComponent {

  _gallery: ImageGalleryType[] = [];

  @Input() height: string = "100px";
  @Input() thumbnailType: ImageTypeData = "square";
  @Input()
  set gallery(value: ImageGalleryType[]) {
    this._gallery = value;
  }
  get gallery() {
    return this._gallery;
  }
  @Output() currentImage: EventEmitter<ImageGalleryType> = new EventEmitter();

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
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

  }

  show() {

  }
}
