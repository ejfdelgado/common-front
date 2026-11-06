import {
  ControllerUpdateResponse,
  AvatarBodyEvent,
  AVATAR_NAME,
  AVATAR_ANIM_VERSION,
} from '@mytypes/BodyTypes';
import { compareBodyPoses, computeComparableFromModel } from '@avatar/utils/AvatarUtilities';
import { ControlProxy } from '../workers/ControlProxy';
import { P2PService } from 'src/app/services/p2p.service';
import { EventEmitter } from '@angular/core';
import { MicRecordingHandler, ModuloSonido } from 'src/app/services/sonido.service';
import { VoiceLangType, VoiceRecognitionService } from 'src/app/services/voicerecognition.service';
import { FileService } from 'src/app/services/file.srv';
import { SceneControllerAbstractRecord } from './SceneControllerAbstractRecord';

const NPC_NAME = 'dancer';
const NPC_LR = [2, 0, 0];
const DICT_KEY = 'animation_stored';
const DICT_AUDIO_KEY = 'audio_stored';

export class RecordPoseController extends SceneControllerAbstractRecord {
  audioRecordHandler: MicRecordingHandler | null = null;
  audioRecordedUrl: string | null = null;
  audioLoadedUrl: string | null = null;
  audioPlayer: HTMLAudioElement | null = null;

  constructor(
    public override events: EventEmitter<AvatarBodyEvent>,
    public override controlProxy: ControlProxy,
    public override p2pSrv: P2PService,
    public override fileSrv: FileService,
    public voiceRecognitionSrv: VoiceRecognitionService,
  ) {
    super(events, controlProxy, p2pSrv, fileSrv);
    const audios: string[] = ['/assets/sounds/mail.mp3'];
    ModuloSonido.preload(audios);
    const commandsMap: Map<VoiceLangType, { [key: string]: string }> = new Map();
    commandsMap.set('es-ES', {
      grabar: 'start',
      detener: 'stop',
      parar: 'stop',
      cargar: 'load',
      mover: 'play',
      reproducir: 'play',
      pausa: 'pause',
      guardar: 'save',
    });
    commandsMap.set('en-US', {
      start: 'start',
      stop: 'stop',
      load: 'load',
    });
    this.voiceRecognitionSrv.addCommands(commandsMap);
  }

  async evaluateComparison() {
    if (this.state != 'PLAYING') {
      return;
    }
    const referenceAvatar = this.scene.getObjectByName(NPC_NAME);
    const actualAvatar = this.scene.getObjectByName(AVATAR_NAME);
    if (referenceAvatar && actualAvatar) {
      const reference = computeComparableFromModel(referenceAvatar);
      const actual = computeComparableFromModel(actualAvatar);

      const total = compareBodyPoses(reference, actual);

      this.setHudValue('percentage', total, false);
      //const r1 = reference.armsOpen;
      //const a1 = actual.armsOpen;
      //this.setHudValue('top', `Ref: ${r1.toFixed(0)} Act: ${a1.toFixed(0)}`, false);
    }
  }

  override async update(): Promise<ControllerUpdateResponse> {
    await this.recordBodyPose();
    await this.evaluateComparison();
    return {};
  }

  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  async assureCharacter() {
    await this.scene.loadCharacter(
      {
        name: NPC_NAME,
        meshName: 'esqueleto009_1_web.glb',
        animations: {},
      },
      false,
    );
  }

  async startRecording() {
    this.placeCamera(true);
    ModuloSonido.play('/assets/sounds/mail.mp3');
    this.state = 'RECORDING';
    this.history = { v: AVATAR_ANIM_VERSION, a: [] };
    this.recordingStartTime = Date.now();
    this.audioRecordHandler = await ModuloSonido.recordFromMic();
  }

  async stopAll() {
    ModuloSonido.play('/assets/sounds/message.mp3');
    this.setHudValue('percentage', null, false);
    this.placeCamera(true);
    if (['PLAYING', 'PAUSED'].indexOf(this.state) >= 0) {
      if (this.scene) {
        this.scene.animationStop();
      }
      this.stopAudioPlayer();
    } else if (this.state == 'RECORDING') {
      if (this.audioRecordHandler) {
        const { url } = await this.audioRecordHandler.stop();
        if (this.audioRecordedUrl) {
          URL.revokeObjectURL(this.audioRecordedUrl);
        }
        this.audioRecordedUrl = url;
        this.audioRecordHandler = null;
      }
    }
    this.state = 'STOPED';
  }

  stopAudioPlayer() {
    const player = this.audioPlayer;
    if (!player) {
      return;
    }
    player.pause();
    player.currentTime = 0;
    player.removeAttribute('src'); // Detach the media resource
    player.load(); // Flush buffers so the element is fully released
    this.audioPlayer = null;
  }

  async loadStoredAudio() {
    if (!this.scenario || !this.scenario.dictionary) {
      return;
    }
    // Fetch the audio from bucket url and expose it as an in-memory blob: URL
    const oldAudio = this.scenario.dictionary[DICT_AUDIO_KEY];
    if (this.audioLoadedUrl) {
      URL.revokeObjectURL(this.audioLoadedUrl);
      this.audioLoadedUrl = null;
    }
    if (oldAudio) {
      const arrayBuffer = await this.fileSrv.getBinary(oldAudio);
      const blob = new Blob([arrayBuffer], { type: 'audio/webm' });
      this.audioLoadedUrl = URL.createObjectURL(blob);
    }
  }

  async playRecord() {
    ModuloSonido.play('/assets/sounds/marimba_on.mp3');
    if (this.scene) {
      if (this.state == 'PAUSED') {
        if (this.audioPlayer) {
          this.audioPlayer.play();
        }
      } else {
        await this.assureCharacter();
        await this.loadStoredAudio();
        if (this.scenario?.dictionary && this.history.a.length == 0) {
          // Fetch the animation from bucket url
          let oldName = this.scenario.dictionary[DICT_KEY];
          if (oldName) {
            await this.scene.applyAnimationToCharacter(NPC_NAME, {
              loop: false,
              startingTimeMillis: 0,
              animationUrl: oldName,
              lr: NPC_LR,
            });
          }
        } else {
          // Fetch the animation from the in memory array
          await this.scene.applyAnimationToCharacter(NPC_NAME, {
            loop: false,
            startingTimeMillis: 0,
            animationBin: this.history,
            lr: NPC_LR,
          });
        }
        this.stopAudioPlayer();
        if (this.audioRecordedUrl) {
          this.audioPlayer = new Audio(this.audioRecordedUrl);
          this.audioPlayer.play();
        } else if (this.audioLoadedUrl) {
          this.audioPlayer = new Audio(this.audioLoadedUrl);
          this.audioPlayer.play();
        }
      }
      this.state = 'PLAYING';
      this.placeCamera(false);
      this.scene.animationPlay();
    }
  }

  async prepare() {
    if (this.scene) {
      await this.assureCharacter();
      // TODO, place at some position with some animation
      const anim = await this.scene.applyAnimationToCharacter(NPC_NAME, {
        loop: true,
        startingTimeMillis: 0,
        animationBin: this.history,
        lr: NPC_LR,
      });
      const state = anim?.a[0];
      if (state) {
        this.scene.applyAvatarStateByName(NPC_NAME, state, NPC_LR);
      }
    }
  }

  async pauseReproduction() {
    if (this.state != 'PLAYING') {
      return;
    }
    this.state = 'PAUSED';
    if (this.scene) {
      ModuloSonido.play('/assets/sounds/hangdown.mp3');
      this.scene.animationPause();
    }
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  }

  async saveRecording() {
    await this.stopAll();
    ModuloSonido.play('/assets/sounds/message.mp3');
    if (this.history.a.length > 0) {
      await this.saveAnimation(DICT_KEY);
      if (this.audioRecordedUrl) {
        await this.saveAudio(DICT_AUDIO_KEY, this.audioRecordedUrl);
      }

      this.events.emit({
        name: 'SAVE_APPLY_SCENARIO',
        data: this.scenario,
      });
    }
  }

  override async onEvent(event: AvatarBodyEvent): Promise<void> {
    if (event.name == 'VOICE_COMMAND') {
      if (event.voiceCommand == 'start') {
        await this.startRecording();
      } else if (event.voiceCommand == 'stop') {
        await this.stopAll();
      } else if (event.voiceCommand == '...') {
        await this.prepare();
      } else if (event.voiceCommand == 'play') {
        await this.playRecord();
      } else if (event.voiceCommand == 'pause') {
        await this.pauseReproduction();
      } else if (event.voiceCommand == 'save') {
        await this.saveRecording();
      }
    } else if (event.name == 'STAND2MATRIX') {
      if (event.data) {
        this.transformationMatrix = event.data;
      }
    } else if (event.name == 'START_ALL') {
      this.placeCamera(true);
    } else if (event.name == 'STOP_ALL') {
      await this.stopAll();
    }
  }

  placeCamera(single: boolean) {
    if (this.scene) {
      this.scene.forceCameraState({
        near: 0.1,
        far: 1000,
        fov: 15,
        lookAt: {
          x: single ? 0 : NPC_LR[0] / 2,
          y: 1,
          z: 0,
        },
        position: {
          x: single ? 0 : NPC_LR[0] / 2,
          y: 1,
          z: 10,
        },
      });
    }
  }
}
