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
import { CommonSpeech, VoiceQuery } from "../../../commonSpeech";
import { CommandConfigType, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { Question, QuestionDataType } from "../question/question";
import { shuffleInPlace } from '@tools/ArrayUtil';
import { BooleanStateService } from "@services/boolean-state.service";
import { Statusbar } from "../statusbar/statusbar";
import { isMobile } from '@tools/mobile';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';

const BASE_BUCKET = `https://storage.googleapis.com/pro-ejflab-assets`;

export interface PanoConfig {
  title: string;
  subtitle: string;
  imageUrl: string;
  audioUrl: string | null;
}

@Component({
  standalone: true,
  selector: 'app-threejs',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    Question,
    Statusbar,
  ],
  templateUrl: './threejs.component.html',
  styleUrls: ['./threejs.component.css'],
})
export class ThreejsComponent extends CommonSpeech implements OnInit, AfterViewInit {
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  @ViewChild('myparent') parentRef!: ElementRef;
  @ViewChild('fadable_container') parentFade!: ElementRef;
  cameraChoice: boolean = true;
  scene: BasicScene | null = null;
  bounds: DOMRect | null = null;
  soundActivated: boolean = false;
  queryParam: string = "";
  viewState: "photo" | "map" | "print" = "photo";
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  hasMobile: boolean;
  useStereo: boolean = false;
  isSystemListening: boolean = false;
  listeningTimeoutPercentage: number = 0;
  fadeTimeout: NodeJS.Timeout | null = null;
  configuration: PanoConfig = {
    title: "Las mejores cosas de la vida",
    subtitle: "toman tiempo...",
    imageUrl: "",
    audioUrl: null,
  };
  questions: QuestionDataType[] = [
    {
      photo: "/pano/2025-07/001/pano.jpg",
      sound: "/pano/2025-07/001/ambience.aac",
      //intro: "Imagina una ciudad que se alza en medio de un enorme valle verde, rodeada por montañas que parecen abrazarla. Su clima es tan suave que muchos la llaman “la ciudad de la eterna primavera”: no hace demasiado calor, ni demasiado frío, y siempre hay flores en los jardines, en los parques y hasta en los balcones.",
      intro: "intro",
      text: '¿A qué ciudad colombiana se le conoce como "La ciudad de la eterna primavera"?',
      options: [
        {
          id: "gato",
          idRegex: "gato",
          emoji: "🐱",
          text: "Cali",
        }, {
          id: "perro",
          idRegex: "perro",
          emoji: "🐶",
          text: "Cartagena",
        },
        {
          id: "mico",
          idRegex: "mi[ck]o",
          emoji: "🐒",
          text: "Barranquilla",
        }, {
          id: "león",
          idRegex: "leon",
          emoji: "🦁",
          text: "Medellín",
          points: 1,
        }
      ]
    }
  ];
  currentQuestion: QuestionDataType | null = null;

  constructor(
    public override indicatorSrv: IndicatorService,
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService, sanitizer, fullScreenSrv, "es-ES");
    this.hasMobile = isMobile();

    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "ayuda": "help",
          "hola": "hello",
          "ola": "hello",
          "pregunta": "ask",
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
      if (command.command == "hello") {
        this.askName();
      } else if (command.command == "ask") {
        this.placeQuestion(this.questions[0]);
      }
      //console.log(command);
    });

    this.booleanService.state$.subscribe(value => {
      this.isSystemListening = value.inUse;
      if (typeof value.percentage == "number") {
        this.listeningTimeoutPercentage = value.percentage;
      }
      try {
        this.cdr.detectChanges();
      } catch (err) { }
    });
  }

  playSuccess() {
    ModuloSonido.play(BASE_BUCKET + "/sounds/violin_success.mp3", false, 1, 0);
  }

  playFail() {
    ModuloSonido.play(BASE_BUCKET + "/sounds/loose.mp3", false, 1, 0);
  }

  async placeQuestion(question: QuestionDataType) {
    if (this.currentQuestion != null) {
      return;
    }
    const LONG_TIMEOUT = 60000;
    this.cdr.detectChanges();
    await this.scene?.addPanorama(question);
    this.fadeIn();
    const sonidoUrl = BASE_BUCKET + question.sound;

    shuffleInPlace(question.options);
    this.stopListening();

    ModuloSonido.play(sonidoUrl, true, 1, null);
    await this.talk(question.intro);
    do {
      ModuloSonido.play(sonidoUrl, true, 1, null);
      this.currentQuestion = question;
      this.cdr.detectChanges();
      await this.talk(question.text);
      ModuloSonido.pause(sonidoUrl);
      const INTRO_OPC: string[] = [
        "las opciones son: ",
        "elige una opción: ",
        "escoge la respuesta que consideres verdadera: ",
        "cual es la respuesta correcta?: ",
        "elige la respuesta correcta: ",
      ];
      let textoCompleto = "";
      let opciones: VoiceQuery[] = [];
      for (let option of question.options) {
        textoCompleto += `Di ${option.id}, para ${option.text}.`;
        opciones.push({
          index: 1,
          reg: new RegExp(`(${option.idRegex})`, "ig"),
        });
      }

      const respuesta = await this.genericVoiceQuery(
        INTRO_OPC.map((prefix) => prefix + textoCompleto),
        opciones,
        LONG_TIMEOUT,
      );

      const idChoice = respuesta.index;
      if (idChoice < question.options.length) {
        question.options.forEach((el) => el.selected = false);
        const selectedChoice = question.options[idChoice];
        selectedChoice.selected = true;
        this.cdr.detectChanges();
        const correctQuestions = question.options.filter((op) => {
          return typeof op.points == "number" && op.points > 0;
        });

        const CONFIRM: string[] = [
          `Di "última palabra" para ${selectedChoice.id}, ${selectedChoice.text}, o di "cancelar" para cambiar la respuesta.`,
        ];
        let confirmOptionsPositive: VoiceQuery[] = [
          { reg: /(ultima palabra)/ig, index: 1 },
          { reg: /(si)/ig, index: 1 },
          { reg: /(correcto)/ig, index: 1 },
        ];
        let confirmOptionsNegative: VoiceQuery[] = [
          { reg: /(no)/ig, index: 1 },
          { reg: /(cancelar)/ig, index: 1 },
          { reg: /(cambiar)/ig, index: 1 },
        ];

        const confirmation = await this.genericVoiceQuery(
          CONFIRM,
          [...confirmOptionsNegative, ...confirmOptionsPositive],
          LONG_TIMEOUT,
        );

        if (confirmation.index >= confirmOptionsNegative.length) {
          if (typeof selectedChoice.points == "number" && selectedChoice.points > 0) {
            const SUCCESS_TEXT: string[] = [
              "Correcto!",
              "Excelente!",
              "Muy bien hecho!",
            ];
            const suffix = ` La respuesta correcta es ${correctQuestions[0].id}, ${correctQuestions[0].text}`;
            shuffleInPlace(SUCCESS_TEXT);
            this.playSuccess();
            await this.talk(SUCCESS_TEXT.map((op) => op + suffix)[0]);
            break;
          } else {
            const ERROR_TEXT: string[] = [
              `Te has equivocado, `,
              `Lo siento mucho, `,
              `Ups!, `,
            ];
            const suffix = ` La respuesta correcta era ${correctQuestions[0].id}, ${correctQuestions[0].text}`;
            shuffleInPlace(ERROR_TEXT);
            this.playFail();
            await this.talk(ERROR_TEXT.map((op) => op + suffix)[0]);
            break;
          }
        } else {
          question.options.forEach((el) => el.selected = false);
          this.cdr.detectChanges();
        }
      }
    } while (true);
    await this.fadeOut();
    this.currentQuestion = null;
    this.cdr.detectChanges();
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
      this.setFullScreen(true);
      this.startListening();
    } else {
      //this.scene?.disableGyro();// No need to disable
      this.setFullScreen(false);
      this.stopListening();
    }
    this.onResize(null);
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.setFadeValue(0);
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
      this.scene.localRender(this.useStereo, this.cameraChoice);
      this.cdr.detectChanges();
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
    const urlParams = getUrlQueryParams();
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

  setFadeValue(value: number) {
    // Clamp between 0 and 1
    const v = Math.min(1, Math.max(0, value));

    // Convert 0→1 into alpha 255→0  
    const alpha = Math.round((1 - v) * 255);

    // Convert alpha to 2-digit hex
    const alphaHex = alpha.toString(16).padStart(2, '0');

    // Build final ARGB hex color (#000000AA)
    const color = `#000000${alphaHex}`;
    this.parentFade.nativeElement.style.backgroundColor = color;
  }

  async fadeIn() {
    if (this.fadeTimeout) {
      clearInterval(this.fadeTimeout);
    }
    let current = 0;
    let steps = 100;
    let millis = 5000;
    let increase = 1 / steps;
    this.setFadeValue(current);
    return new Promise<void>((resolve) => {
      this.fadeTimeout = setInterval(() => {
        current += increase;
        current = Math.min(1, current);
        this.setFadeValue(current);
        if (current == 1) {
          if (this.fadeTimeout) {
            clearInterval(this.fadeTimeout);
          }
          resolve();
        }
      }, millis / steps);
    });
  }

  async fadeOut() {
    if (this.fadeTimeout) {
      clearInterval(this.fadeTimeout);
    }
    let current = 1;
    let steps = 100;
    let millis = 3000;
    let increase = 1 / steps;
    this.setFadeValue(current);
    return new Promise<void>((resolve) => {
      this.fadeTimeout = setInterval(() => {
        current -= increase;
        current = Math.max(0, current);
        this.setFadeValue(current);
        if (current == 0) {
          if (this.fadeTimeout) {
            clearInterval(this.fadeTimeout);
          }
          resolve();
        }
      }, millis / steps);
    });
  }
}
