import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService, Wait } from "@services/indicator.service";
import { ThreejsComponent } from "./threejs/threejs.component";
import { CommonSpeech } from "../commonSpeech";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { Fullscreen } from '@components/fullscreen/fullscreen';
import { ModuloSonido } from '@services/sonido.service';
import { tracker } from '@tools/tracker.js';
import { BodyData, BodyKeyPointData } from '@mytypes/bodyTypes';
import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

@Component({
  selector: 'app-threejstest',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ThreejsComponent,
    Fullscreen,
  ],
  templateUrl: './threejstest.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    './threejstest.component.scss',
    '../../../threejs_styles.scss',
  ],
})
export class ThreejsTestComponent extends CommonSpeech {

  @ViewChild("three_component") threeComponent!: ThreejsComponent;
  started: boolean = false;
  activity: Wait | null = null;
  poses: BodyData[] = [];

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService, sanitizer, fullScreenSrv);
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "guardar": "save",
          "restaurar": "restore",
        },
        "en-US": {
          "save": "save",
          "restore": "restore",
        },
        "fr-FR": {}
      },
    };
    const { word$, command$ } = this.voiceSrv.singleWordConnect(config);

    setInterval(() => {
      if (this.adjustWords()) {
        this.cdr.detectChanges();
      }
    }, 1000);

    const addWordFun = (input: RecognizedWordId) => {
      this.words.push({
        word: input.word,
        time: input.timestamp,
        id: input.id,
        color: this.getNextColor(),
      });
      this.adjustWords();
      this.cdr.detectChanges();
    };

    word$.subscribe(addWordFun);
    command$.subscribe((command) => {
      this.threeComponent.executeCommand(command);
      if (command.command == "save") {
        this.savePosititon();
      }
    });
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
  }

  async ngOnInit() {
    const promise = this.indicatorSrv.start();
    await tf.ready();
    this.initializeBodyTracker();
    await this.speechSrv.init();
    promise.done();
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
      if (this.activity) {
        this.activity.done();
        this.activity = null;
      }
      if (this.poses.length > 0) {
        this.threeComponent.computeIK(this.poses);
      }
    });
  }

  async startTracking() {
    this.started = true;
    //this.enterFullScreen();
    //ModuloSonido.play('/assets/sounds/nature.mp3', true);
    ModuloSonido.play('/assets/sounds/button.mp3');
    this.activity = this.indicatorSrv.start();
    tracker.run('camera');
  }

  async stopTracking() {
    tracker.pause();
  }

  downloadOBJ(data: string, filename = 'model.obj') {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  async savePosititon() {
    if (!this.poses || this.poses.length == 0) {
      return;
    }
    const keypoints3D = this.poses[0].keypoints3D;
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const group = new THREE.Group();
    const SPHERE_RADIUS = 0.01;
    const SCALING = 1;
    for (let i = 0; i < keypoints3D.length; i++) {
      const keyPoint = keypoints3D[i];
      const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 8, 8);
      const sphere = new THREE.Mesh(geometry, material);

      sphere.position.set(
        SCALING * keyPoint.x,
        SCALING * keyPoint.y,
        SCALING * keyPoint.z,
      );
      sphere.name = keyPoint.name;
      group.add(sphere);
    }
    group.updateMatrixWorld(true);
    const exporter = new GLTFExporter();
    exporter.parse(group, function (result) {
      let output;
      let filename;

      if (result instanceof ArrayBuffer) {
        // Binary (.glb)
        output = result;
        filename = 'model.glb';
      } else {
        // JSON (.gltf)
        output = JSON.stringify(result, null, 2);
        filename = 'model.gltf';
      }

      const blob = new Blob([output], {
        type: result instanceof ArrayBuffer
          ? 'application/octet-stream'
          : 'application/json'
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(url);
    },
      function (error) {
        console.error('Export error:', error);
      },
      {
        binary: true,
        trs: false,
        onlyVisible: true,
        truncateDrawRange: true
      });
  }
}
