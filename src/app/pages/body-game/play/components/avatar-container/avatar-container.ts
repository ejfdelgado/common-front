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
import { IndicatorService } from '@services/indicator.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { ComponentWithAvatar } from '@avatar/ComponentWithAvatar';
import { HttpClient } from '@angular/common/http';
import { Point3D } from '@mytypes/BodyTypes';
import { P2PService } from '@services/p2p.service';


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

  hasMobile: boolean;
  @Output() headUpLog: EventEmitter<any> = new EventEmitter();

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override p2pSrv: P2PService,
    //
    private indicatorSrv: IndicatorService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {
    super(sanitizer, fullScreenSrv, p2pSrv);
    this.hasMobile = this.isMobile();
  }

  ngOnDestroy(): void {
    if (this.restoreInterval) {
      clearInterval(this.restoreInterval);
    }
  }

  public override getParentRef(): ElementRef {
    return this.parentRef;
  }

  @HostListener('window:resize', [])
  public override onResize() {
    super.onResize();
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

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize();
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
