import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  CommandConfigType,
  RecognizedWordId,
  VoiceRecognitionService,
} from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService } from "@services/indicator.service";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { AvatarContainer } from '../avatar-container/avatar-container';
import { AvatarService } from '@services/avatar.service';
import { P2PService } from '@services/p2p.service';
import { ComponentP2P } from '@avatar/ComponentP2P';
import { ConfigService } from '@services/config.service';

@Component({
  selector: 'app-body-tracker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    AvatarContainer,
  ],
  templateUrl: './body-tracker.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    './body-tracker.scss',
    '../../../../../../threejs_styles.scss',
  ],
})
export class BodyTracker extends ComponentP2P implements AfterViewInit {

  @ViewChild("three_component") avatarContainer!: AvatarContainer;
  @ViewChild('video') videoRefGlobal!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRefGlobal!: ElementRef<HTMLCanvasElement>;
  headUpLogData: any = {};

  constructor(
    public override cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override avatarSrv: AvatarService,
    public override configSrv: ConfigService,
    public override p2pSrv: P2PService,
  ) {
    super(
      voiceSrv,
      speechSrv,
      indicatorSrv,
      booleanService,
      sanitizer,
      fullScreenSrv,
      cdr,
      avatarSrv,
      configSrv,
      p2pSrv,
    );
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "guardar": "save",
          "iniciar": "start",
          "detener": "stop",
        },
        "en-US": {
          "save": "save",
          "start": "start",
          "stop": "stop",
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
      this.avatarContainer.executeCommand(command);
      if (command.command == "save") {
        this.downloadTextPlain();
      }
    });
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
  }

  async ngAfterViewInit() {
    const promise = this.indicatorSrv.start();
    const promises = [];
    promises.push(this.initializeBodyTracker(
      this.videoRefGlobal,
      this.canvasRefGlobal,
      this.avatarContainer,
    ));
    promises.push(this.speechSrv.init());
    await Promise.all(promises);
    promise.done();
    this.cdr.detectChanges();
  }

  headUpLog(event: any) {
    this.headUpLogData = event;
    //this.cdr.detectChanges();
  }

  override getAvatarContainer(): AvatarContainer {
    return this.avatarContainer;
  }
}
