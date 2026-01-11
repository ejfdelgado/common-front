import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IndicatorService } from "@services/indicator.service";
import { GoogleAuthService } from "@services/google-auth.service";
import { CameraCaptureComponent } from '@components/camera-capture/camera-capture';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { FileService, StorageType } from '@services/file.srv';
import { FirestoreService } from '@services/firestore.service';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    CommonModule,
    CameraCaptureComponent
  ],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index implements AfterViewInit {

  @ViewChild("camera_capture_bucket") cameraBucket!: CameraCaptureComponent;
  @ViewChild("camera_capture_harddrive") cameraHarddrive!: CameraCaptureComponent;
  openCamera$ = new Subject<void>();

  firestoreTemporal: any = { count: 0 };
  pageList: any[] = [];
  devices: any = null;

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: GoogleAuthService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public cdr: ChangeDetectorRef,
  ) {
    this.authSrv.authState$.subscribe(user => {
      if (user) {
        console.log('Logged in:', user.name);
      } else {
        console.log('Logged out');
      }
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
    this.cameraHarddrive.getResult$().subscribe({
      next: async (blob) => {
        try {
          const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "hard_drive");
        } catch (err) { }
      },
      error: (err) => console.error('Camera error', err),
      complete: () => console.log('Camera closed')
    });
  }

  callPublic() {
    this.http.get(`${environment.apiUrl}public/health`).subscribe((res) => {
      console.log(res);
    });
  }

  callPrivate() {
    this.http.get(`${environment.apiUrl}check_user`).subscribe((res) => {
      console.log(res);
    });
  }

  async deleteFile(type: StorageType) {
    await this.fileSrv.delete("prueba/archivo.jpg", type);
  }

  async openFile(type: StorageType) {
    await this.fileSrv.open("prueba/archivo.jpg", type);
  }

  async firestoreCreateUpdate() {
    const data = {
      id: "dog",
      name: "Laica",
      created: Date.now(),
    };
    const conf: any = {
      autoAuthor: true,
    };
    await this.firestoreSrv.createUpdate("animals", data, conf);
  }

  async firestoreCreateUpdate2() {
    const conf: any = {
      autoAuthor: true,
    };
    const response = await this.firestoreSrv.createUpdate("animals", this.firestoreTemporal, conf);
    this.firestoreTemporal.id = response.id;
    this.firestoreTemporal.count += 1;
  }

  async firestorePaginate() {
    this.pageList = await this.firestoreSrv.paging("pro-animals");
    this.cdr.detectChanges();
  }

  async showDevices() {
    this.devices = await navigator.mediaDevices.enumerateDevices();
    this.cdr.detectChanges();
  }
}
