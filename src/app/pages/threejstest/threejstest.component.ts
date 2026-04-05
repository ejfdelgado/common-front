import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
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
import { BodyData, BodyState } from '@mytypes/bodyTypes';

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
        "es-ES": {},
        "en-US": {},
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
    });
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
  }

  async ngOnInit() {
    const promise = this.indicatorSrv.start();
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
      this.cdr.detectChanges();
    });
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
}
