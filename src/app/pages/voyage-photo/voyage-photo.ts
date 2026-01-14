import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CameraCaptureComponent } from '@components/camera-capture/camera-capture';
import { CardDoc } from '@components/card-doc/card-doc';
import { SearchInputComponent } from '@components/search-input/search-input';
import { MarkType, SimpleMapComponent } from '@components/simple-map/simple-map';
import { MenuOptionType, Statusbar } from '@components/statusbar/statusbar';
import { FileService, StorageType } from '@services/file.srv';
import { FirestoreService } from '@services/firestore.service';
import { GoogleAuthService } from '@services/google-auth.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';

@Component({
  selector: 'app-voyage-photo',
  standalone: true,
  imports: [
    CommonModule,
    CameraCaptureComponent,
    SimpleMapComponent,
    MatButtonModule,
    Statusbar,
    SearchInputComponent,
    CardDoc,
  ],
  templateUrl: './voyage-photo.html',
  styleUrl: './voyage-photo.scss',
})
export class VoyagePhoto implements AfterViewInit {
  @ViewChild("camera_capture_bucket") cameraBucket!: CameraCaptureComponent;
  @ViewChild("simple_map") simpleMap!: SimpleMapComponent;
  menuOptions: MenuOptionType[] = [];

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: GoogleAuthService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public cdr: ChangeDetectorRef,
    public locationSrv: LocationService,
  ) {
    this.authSrv.authState$.subscribe(user => {
      if (user) {
        console.log('Logged in:', user.name);
      } else {
        console.log('Logged out');
      }
    });
    this.menuOptions.push({
      label: "Tomar foto",
      icon: "photo_camera",
      callback: this.capturePhoto.bind(this),
    });
  }

  ngAfterViewInit(): void {
    this.cameraBucket.getResult$().subscribe({
      next: async (blob) => {
        try {
          const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "bucket");
        } catch (err) { }
      },
      error: (err) => console.error('Camera error', err),
      complete: () => console.log('Camera closed')
    });
  }

  async transformMark(data: MarkType) {
    return `<b class="white_subtitle" style="font-size: 2em;">📍</b>`;
  }

  async addMark() {
    const activity = this.indicatorSrv.start();
    try {
      const pos = await this.locationSrv.getCurrentPosition();
      const marker: MarkType = {
        id: "",
        lat: pos.latitude,
        lon: pos.longitude,
        title: new Date().toDateString(),
      };
      const observable = await this.simpleMap.addMarker(marker);
      observable.subscribe((mark) => {
        console.log(mark);
      });
    } catch (err) { }
    activity.done();
  }

  async capturePhoto() {
    await this.cameraBucket.openCamera();
  }
}
