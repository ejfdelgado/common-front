import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { IndicatorService } from "@services/indicator.service";
import { GoogleAuthService } from "@services/google-auth.service";
import { CameraCaptureComponent } from '@components/camera-capture/camera-capture';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { BucketService } from '@services/bucket.service';
import { HardDriveService } from '@services/harddrive.service';
import { FileService } from '@services/file.srv';

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

  @ViewChild("camera_capture") camera!: CameraCaptureComponent;
  openCamera$ = new Subject<void>();

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: GoogleAuthService,
    private http: HttpClient,
    private fileSrv: FileService,
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
    this.camera.getResult$().subscribe({
      next: async (blob) => {
        //console.log('Image captured:', blob);
        // upload / preview / save
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
}
