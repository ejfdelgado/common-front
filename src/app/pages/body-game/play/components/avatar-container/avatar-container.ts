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
import { RecognizedCommand, VoiceRecognitionService } from '@services/voicerecognition.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { ComponentWithAvatar } from '@avatar/ComponentWithAvatar';
import { HttpClient } from '@angular/common/http';
import {
  AvatarBodyEvent,
  CursorData,
  CursorPointerGUI,
  CursorStateData,
  HudDisplayData,
  Point3D,
} from '@mytypes/BodyTypes';
import { P2PService } from '@services/p2p.service';
import { SpeechSynthesisService } from 'src/app/services/speechsynthesis.service';
import { RatingComponent } from 'src/app/components/fields/rating/rating';
import { html2text } from 'src/app/tools/HtmlUtil';
import { FileService } from 'src/app/services/file.srv';

@Component({
  standalone: true,
  selector: 'app-avatar-container',
  imports: [CommonModule, FormsModule, MatIconModule, RatingComponent],
  templateUrl: './avatar-container.html',
  styleUrls: ['./avatar-container.scss'],
})
export class AvatarContainer
  extends ComponentWithAvatar
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('myparent') parentRef!: ElementRef;
  @ViewChild('mycanvas') canvasRef!: ElementRef;

  hasMobile: boolean;
  @Output() headUpLog: EventEmitter<any> = new EventEmitter();
  @Output() notifications: EventEmitter<AvatarBodyEvent> = new EventEmitter();

  leftCursor: CursorPointerGUI = {
    style: {
      top: '0px',
      left: '0px',
    },
    open: true,
    visible: false,
  };
  rightCursor: CursorPointerGUI = {
    style: {
      top: '0px',
      left: '0px',
    },
    open: true,
    visible: false,
  };

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override p2pSrv: P2PService,
    public override cdr: ChangeDetectorRef,
    public override speechSrv: SpeechSynthesisService,
    public override voiceRecognitionSrv: VoiceRecognitionService,
    public override fileSrv: FileService,
    //
    private indicatorSrv: IndicatorService,
    private http: HttpClient,
  ) {
    super(sanitizer, fullScreenSrv, cdr, p2pSrv, speechSrv, voiceRecognitionSrv, fileSrv);
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
    };
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
    };
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
      name: 'VOICE_COMMAND',
      voiceCommand: command.command,
    });
  }

  override setCursor(data: CursorData): void {
    if (!this.scene) {
      return;
    }
    const bounds = this.scene.bounds;
    const x = bounds.width * data.x;
    const y = bounds.height * data.y;
    const side = data.type;

    let cursorGUI: CursorPointerGUI = this.rightCursor;
    if (side == 'L') {
      cursorGUI = this.leftCursor;
    }
    cursorGUI.style.top = y + 'px';
    cursorGUI.style.left = x + 'px';
  }

  override setCursorState(data: CursorStateData): void {
    const side = data.type;
    let cursorGUI: CursorPointerGUI = this.rightCursor;
    if (side == 'L') {
      cursorGUI = this.leftCursor;
    }
    cursorGUI.visible = true;
    cursorGUI.open = data.state == 'on';
  }

  hasText(val: any) {
    const innerText = (val as any)['changingThisBreaksApplicationSecurity'];
    if (!(typeof innerText == 'string')) {
      return false;
    }
    const rawText = html2text(innerText);
    return typeof rawText == 'string' && rawText.trim().length > 0;
  }

  hasNumber(val: any) {
    return typeof val == "number" && !isNaN(val);
  }

  notifyEvent(event: AvatarBodyEvent): void {
    this.notifications.emit(event);
  }

  computePercentageColor(per: number) {
    // Clamp to [0, 100]; treat invalid input as 0 (red)
    const p = Number.isFinite(per) ? Math.min(100, Math.max(0, per)) : 0;
    // Interpolate only the hue: 0° (red) -> 60° (yellow) -> 120° (green)
    const hue = p * 1.2;
    // HSV with S = 1 and V = 1 (maximum saturation) converted to RGB.
    // For hue in [0, 120] the blue channel is always 0.
    let r: number;
    let g: number;
    if (hue <= 60) {
      r = 255;
      g = Math.round((hue / 60) * 255);
    } else {
      r = Math.round(((120 - hue) / 60) * 255);
      g = 255;
    }
    return `rgb(${r},${g},0)`;
  }
}
