import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BasicScene } from './BasicScene';
import { IndicatorService, Wait } from '@services/indicator.service';
import { MatIconModule } from '@angular/material/icon';
import { PromiseEmitter } from "@tools/PromiseEmitter";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { SceneWithAvatarComponent } from './SceneWithAvatarComponent';
import { WalkController } from './controllers/WalkController';
import { SoundFeedbackController } from './controllers/SoundFeedbackController';
import { Stand2dController } from './controllers/stand2dController';

@Component({
  standalone: true,
  selector: 'app-threejs',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './threejs.component.html',
  styleUrls: ['./threejs.component.css'],
})
export class ThreejsComponent extends SceneWithAvatarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('myparent') parentRef!: ElementRef;
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  bounds: DOMRect | null = null;
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  hasMobile: boolean;
  restoreInterval: NodeJS.Timeout | null = null;
  // controllers
  walkController: WalkController = new WalkController(this.events);
  soundFeedbackController: SoundFeedbackController = new SoundFeedbackController(this.events);
  stand2dController: Stand2dController = new Stand2dController(this.events);

  constructor(
    private indicatorSrv: IndicatorService,
    private cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
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
      this.scene.setBounds(this.bounds);
    }
  }

  ngAfterViewInit(): void {
    this.computeDimensions();
    if (this.bounds == null) {
      return;
    }
    const theCanvas = this.canvasRef.nativeElement;
    this.scene = new BasicScene(theCanvas, this.bounds, this.indicatorSrv);
    this.scene.initialize();
    this.sceneCreated.resolve();
    // Add controllers
    // The order matters...
    this.addController(this.walkController);
    this.addController(this.soundFeedbackController);
    this.addController(this.stand2dController);
    this.loop();
  }

  loop() {
    if (this.scene && this.scene.camera && this.scene.renderer && this.scene.orbitals) {
      this.scene.camera.updateProjectionMatrix();
      this.scene.renderer.render(this.scene, this.scene.camera);
      this.scene.orbitals.update();
      this.scene.animate();
      requestAnimationFrame(() => {
        this.loop();
      });
    }
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

  startSkeletonGuardinan() {
    this.restoreInterval = setInterval(() => {
      if (!this.scene) {
        return;
      }
      this.scene.restoreBackupOnNextComputation = true;
    }, 5 * 1000);
  }

  executeCommand(command: RecognizedCommand) {
    if (!this.scene) {
      return;
    }
    this.scene.executeCommand(command);
  }
}
