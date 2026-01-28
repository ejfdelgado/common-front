import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { ImageGalleryType } from 'types/fieldsTypes';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [
    CommonModule,
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

  @Input() mode: "full" | "embedded" = "embedded";
  @Input() height: number = 300;
  @Input()
  set gallery(value: ImageGalleryType[]) {
    this._gallery = value;
  }
  get gallery() {
    return this._gallery;
  }

  constructor(
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  forward() {

  }
}
