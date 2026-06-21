import { AfterViewInit, Component, signal, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CameraCaptureComponent } from '@components/camera-capture/camera-capture';
import { IndicatorComponent } from "@components/indicator/indicator.component";
import { FileService } from '@services/file.srv';
import { ParamsService } from '@services/params.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterOutlet,
    IndicatorComponent,
    CameraCaptureComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  @ViewChild("camera_capture_bucket") cameraBucket!: CameraCaptureComponent;
  protected readonly title = signal('common-front');

  constructor(
    private fileSrv: FileService,
    private paramsSrv: ParamsService,
  ) {
    paramsSrv.readOnce();
  }

  ngAfterViewInit(): void {
    this.fileSrv.setPickerComponent(this.cameraBucket);
  }
}
