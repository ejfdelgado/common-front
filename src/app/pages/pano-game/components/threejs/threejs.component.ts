import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BasicScene } from './BasicScene';
import { IndicatorService, Wait } from '@services/indicator.service';
import { ModuloSonido } from '@services/sonido.service';
import { MatIconModule } from '@angular/material/icon';
import { PromiseEmitter } from "@tools/PromiseEmitter";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonSpeech, SelectOptionType } from "../../../commonSpeech";
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";

export interface PanoConfig {
  title: string;
  subtitle: string;
  imageUrl: string;
  audioUrl: string | null;
  lat?: number;
  lon?: number;
  phone?: number;
}

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
export class ThreejsComponent extends CommonSpeech implements OnInit, AfterViewInit {
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  @ViewChild('myparent') parentRef!: ElementRef;
  scene: BasicScene | null = null;
  bounds: DOMRect | null = null;
  soundActivated: boolean = false;
  queryParam: string = "";
  viewState: "photo" | "map" | "print" = "photo";
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  isFullScreen: boolean = false;
  hasMobile: boolean;
  useStereo: boolean = false;
  configuration: PanoConfig = {
    title: "Las mejores cosas de la vida",
    subtitle: "toman tiempo...",
    imageUrl: "",
    audioUrl: null,
  };

  constructor(
    public override indicatorSrv: IndicatorService,
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv);
    this.hasMobile = this.isMobile();

    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "ayuda": "help",
        },
        "en-US": {
          "help": "help",
        },
        "fr-FR": {
          "aide": "help",//bug don't work aide-moi
        }
      },
    };

    const { word$, command$ } = this.voiceSrv.singleWordConnect(config);

    setInterval(() => {
      this.adjustWords();
    }, 1000);

    const addWordFun = (input: RecognizedWord) => {
      this.words.push({
        word: input.word,
        time: input.timestamp,
        color: this.getNextColor(),
      });
      this.adjustWords();
      this.cdr.detectChanges();
    };

    word$.subscribe(addWordFun);
    command$.subscribe((command) => {
      console.log(command);
    });
  }

  adjustWords() {
    const MAX_NUMBER_OF_WORDS = 5;
    const THRESHOLD_MS = 10000;//10 seconds
    const now = Date.now();
    const initialLen = this.words.length;
    // First limite number of words
    this.words.splice(0, Math.max(0, this.words.length - MAX_NUMBER_OF_WORDS));
    // Second erase old words
    this.words = this.words.filter((word) => {
      return now - word.time < THRESHOLD_MS;
    });
    if (initialLen != this.words.length) {
      this.cdr.detectChanges();
    }
  }

  setViewState(nextState: "map" | "photo" | "print") {
    this.viewState = nextState;
    setTimeout(() => {
      this.onResize({});
    }, 0);
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    this.computeDimensions();
    if (this.scene != null && this.bounds != null) {
      this.scene.setBounds(this.bounds);
    }
  }

  toggleStereo() {
    this.useStereo = !this.useStereo;
    if (this.useStereo) {
      this.scene?.enableGyro();
    } else {
      this.scene?.disableGyro();
    }
    this.onResize(null);
    this.cdr.detectChanges();
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
    this.loop();
  }

  loop() {
    if (this.scene != null && this.scene.camera) {
      this.scene.camera?.updateProjectionMatrix();
      this.scene.localRender(this.useStereo);
      this.scene.orbitals?.update();
      requestAnimationFrame(() => {
        this.loop();
      });
    }
  }

  public computeDimensions() {
    const parentNativeElement = this.parentRef.nativeElement;
    this.bounds = parentNativeElement.getBoundingClientRect();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize({});
    }, 0);
    const urlParams = this.getUrlQueryParams();
    const queryParam = urlParams.get("q");
    if (!queryParam) {
      return;
    }
    const tParam = urlParams.get("t");
    if (tParam) {
      this.tParam = tParam;
    }
    this.queryParam = queryParam;
    this.loadConfiguration(`https://storage.googleapis.com/pro-ejflab-assets/pano/${this.queryParam}/config.json`).then(async (config) => {
      this.configuration = config;
      await this.sceneCreated.promise;
      if (this.scene) {
        await this.scene.setConfig(this.configuration);
      }
      this.cdr.detectChanges();
    });
  }


  stopSound() {
    ModuloSonido.stop(this.configuration.audioUrl + `?t=${this.tParam}`);
    this.soundActivated = false;
  }

  enterFullscreen(element: any) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { // Safari
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE11
      element.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { // Safari
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { // IE11
      (document as any).msExitFullscreen();
    }
  }

  setFullScreen(value: boolean) {
    this.isFullScreen = value;
    if (value) {
      const elem = document.documentElement;
      this.enterFullscreen(elem);
    } else {
      this.exitFullscreen();
    }
  }

  isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }
}
