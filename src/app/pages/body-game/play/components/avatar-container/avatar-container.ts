import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BasicScene } from '../BasicScene';
import { IndicatorService, Wait } from '@services/indicator.service';
import { MatIconModule } from '@angular/material/icon';
import { PromiseEmitter } from "@tools/PromiseEmitter";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { ComponentWithAvatar } from '@avatar/ComponentWithAvatar';
import { WalkController } from '@avatar/controllers/WalkController';
import { SoundFeedbackController } from '@avatar/controllers/SoundFeedbackController';
import { Stand2dController } from '@avatar/controllers/Stand2dController';
import { RecordPoseController } from '@avatar/controllers/RecordPoseController';
import { HttpClient } from '@angular/common/http';
import { TerrainElevationController } from '@avatar/controllers/TerrainElevationController';
import { Point3D } from '@mytypes/BodyTypes';
import { ComparableController } from '@avatar/controllers/ComparableController';
import { SimplePosesDetection } from '@avatar/controllers/SimplePosesDetection';
import { HandsCloseController } from '@avatar/controllers/HandsCloseController';
import { CubeController } from '@avatar/controllers/CubeController';


@Component({
  standalone: true,
  selector: 'app-avatar-container',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './avatar-container.html',
  styleUrls: ['./avatar-container.scss'],
})
export class AvatarContainer extends ComponentWithAvatar implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('myparent') parentRef!: ElementRef;
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  bounds: DOMRect | null = null;
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  hasMobile: boolean;
  @Output() headUpLog: EventEmitter<any> = new EventEmitter();

  constructor(
    private indicatorSrv: IndicatorService,
    private cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private http: HttpClient,
  ) {
    super(sanitizer, fullScreenSrv);
    this.hasMobile = this.isMobile();
  }
  ngOnDestroy(): void {
    if (this.restoreInterval) {
      clearInterval(this.restoreInterval);
    }
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    this.computeDimensions();
    if (this.scene != null && this.bounds != null) {
      this.scene.setBounds(this.bounds, window.devicePixelRatio);
    }
  }

  ngAfterViewInit(): void {
    this.computeDimensions();
    if (this.bounds == null) {
      return;
    }
    const theCanvas = this.canvasRef.nativeElement;
    this.scene = new BasicScene(theCanvas, this.bounds, this.indicatorSrv, this.http);
    this.scene.initialize();
    this.sceneCreated.resolve();
    // Add controllers
    // The order matters...

    this.addController(new ComparableController(this.events, this.controlProxy));
    this.addController(new SimplePosesDetection(this.events, this.controlProxy));
    this.addController(new HandsCloseController(this.events, this.controlProxy));

    this.addController(new TerrainElevationController(this.events, this.controlProxy));
    this.addController(new WalkController(this.events, this.controlProxy));
    this.addController(new Stand2dController(this.events, this.controlProxy));

    this.addController(new SoundFeedbackController(this.events, this.controlProxy));
    this.addController(new RecordPoseController(this.events, this.controlProxy));

    this.addController(new CubeController(this.events, this.controlProxy));
    this.loop();
  }

  override updateHeadsUpLog() {
    if (!this.scene) {
      return;
    }
    const toFixed = (point: Point3D) => {
      return {
        x: point.x.toFixed(2),
        y: point.y.toFixed(2),
        z: point.z.toFixed(2),
      };
    }
    const temp = {
      //front: toFixed(this.stateBody.front), // se evidencia en x
      //up: toFixed(this.stateBody.up), // se evidencia en x
      //left: toFixed(this.stateBody.left), // se evidencia en y
      //leftArm: toFixed(this.stateBody.comparable.leftArm),
      //rightArm: toFixed(this.stateBody.comparable.rightArm),
      //leftLeg: toFixed(this.stateBody.comparable.leftLeg),
      //rightLeg: toFixed(this.stateBody.comparable.rightLeg),
      //handL: this.stateBody.comparable.handL.toFixed(0),
      //handR: this.stateBody.comparable.handR.toFixed(0),
      //footL: this.stateBody.comparable.footL.toFixed(0),
      //footR: this.stateBody.comparable.footR.toFixed(0),
      //isMobile: this.isMobile(),
      //isTPose: this.stateBody.isTPose,
    }
    this.headUpLog.emit(temp);
  }

  public computeDimensions() {
    if (!this.parentRef) {
      return;
    }
    const parentNativeElement = this.parentRef.nativeElement;
    this.bounds = parentNativeElement.getBoundingClientRect();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize({});
    }, 0);
    this.startSkeletonGuardinan();
  }

  executeCommand(command: RecognizedCommand) {
    if (!this.scene) {
      return;
    }
    this.scene.executeCommand(command);
    this.events.emit({
      name: "VOICE_COMMAND",
      voiceCommand: command.command,
    });
  }
}
