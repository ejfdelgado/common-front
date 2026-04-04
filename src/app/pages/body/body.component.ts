import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { tracker } from './tracker.js';
import { BodyData, BodyState } from './threejs-body/types';
import { ThreejsBodyComponent } from './threejs-body/threejs-body.component';
import { ModuloSonido } from '@services/sonido.service';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService, Wait } from '@services/indicator.service';
import { MatIconModule } from '@angular/material/icon';
import * as tf from '@tensorflow/tfjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-body',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ThreejsBodyComponent
  ],
  templateUrl: './body.component.html',
  styleUrl: './body.component.css'
})
export class BodyComponent extends CommonComponent implements OnInit, OnDestroy {
  @ViewChild('child_reference') childComponent!: ThreejsBodyComponent;
  poses: BodyData[] = [];
  states: BodyState[] = [];
  activity: Wait | null = null;
  started: boolean = false;

  constructor(
    public indicatorSrv: IndicatorService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  async initializeBodyTracker() {
    /*
        MoveNetSinglePoseLightning
        MoveNetSinglePoseThunder
        MoveNetMultiPoseLightning
        PoseNetMobileNetV1
        PoseNetResNet50
        BlazePoseLite
        BlazePoseHeavy
        BlazePoseFull
        */
    tracker.setModel('BlazePoseLite');
    /*
    tracker.detectorConfig = {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableSmoothing: true,
        multiPoseMaxDimension: 256,
        enableTracking: true,
        trackerType: poseDetection.TrackerType.BoundingBox
    }
    tracker.minScore = 0.35;
    */
    tracker.elCanvas = '#canvas';
    tracker.elVideo = '#video';
    tracker.enable3D = false;
    // tracker.run('video') // takes video from a movie file (e.g., mp4)
    // tracker.run('stream') // takes video from an m3u8 online stream
    tracker.on('beforeupdate', (poses: any) => {
      this.poses = poses;
    });
  }

  async ngOnInit() {
    await tf.ready();
    this.initializeBodyTracker();
    const response = await ModuloSonido.preload([
      '/assets/sounds/button.mp3',
      '/assets/sounds/clap.mp3',
      '/assets/sounds/on.mp3',
      '/assets/sounds/on1.mp3',
      '/assets/sounds/on2.mp3',
      '/assets/sounds/off.mp3',
      '/assets/sounds/nature.mp3',
      '/assets/sounds/accepted.mp3',
      '/assets/sounds/fall.mp3',
      '/assets/sounds/challenge_start.mp3',
      '/assets/sounds/challenge_finish.mp3',
      '/assets/sounds/tictoc.mp3',
      '/assets/sounds/newscore.mp3',
    ]);
  }

  async ngOnDestroy() {

  }

  async startTracking() {
    this.started = true;
    //this.enterFullScreen();
    ModuloSonido.play('/assets/sounds/nature.mp3', true);
    ModuloSonido.play('/assets/sounds/button.mp3');
    this.activity = this.indicatorSrv.start();
    tracker.run('camera');
  }

  async stopTracking() {
    tracker.pause();
  }

  async renderUpdate(event: any) {
    if (this.activity != null) {
      this.activity.done();
      this.activity = null;
      ModuloSonido.play('/assets/sounds/accepted.mp3');
    }
    // Means the renderer render
  }

  enterFullScreen() {
    const element = document.documentElement; // Target the entire page

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any)['mozRequestFullScreen']) { // Firefox
      (element as any)['mozRequestFullScreen']();
    } else if ((element as any)['webkitRequestFullscreen']) { // Chrome, Safari, and Opera
      (element as any)['webkitRequestFullscreen']();
    } else if ((element as any)['msRequestFullscreen']) { // IE/Edge
      (element as any)['msRequestFullscreen']();
    }
  }

  getRoot() {
    return "/";
  }
}
