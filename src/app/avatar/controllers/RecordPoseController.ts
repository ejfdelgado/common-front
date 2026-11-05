import {
  ControllerUpdateResponse,
  AvatarBodyEvent,
  AVATAR_NAME,
  StoredAvatarAnimation,
  AVATAR_ANIM_VERSION,
  Point3D,
} from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import { encode } from '@msgpack/msgpack';
import * as THREE from 'three';
import {
  compareBodyPoses,
  computeComparableFromModel,
  getStoredAvatarState,
} from '@avatar/utils/AvatarUtilities';
import { ControlProxy } from '../workers/ControlProxy';
import { P2PService } from 'src/app/services/p2p.service';
import { EventEmitter } from '@angular/core';
import { ModuloSonido } from 'src/app/services/sonido.service';
import { VoiceLangType, VoiceRecognitionService } from 'src/app/services/voicerecognition.service';
import { getBucketPath } from 'src/app/tools/BucketPaths';
import { AuthService } from 'src/app/services/auth.service';
import { FileService } from 'src/app/services/file.srv';

const NPC_NAME = 'dancer';
const NPC_LR = [2, 0, 0];
const DICT_KEY = 'animation_stored';
const MAX_STATES_PER_SECOND: number = 10;

export class RecordPoseController extends SceneControllerAbstract {
  recording: boolean = false;
  playing: boolean = false;
  recordingStartTime: number = 0;
  lastRecorded: number = 0;
  history: StoredAvatarAnimation = { v: AVATAR_ANIM_VERSION, a: [] };
  transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

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

  async applyRecording(): Promise<void> {
    const now = Date.now();
    const difference = now - this.lastRecorded;
    if (!this.recording || difference < 1000 / MAX_STATES_PER_SECOND) {
      return;
    }
    // Leer el modelo
    const avatar = this.scene.getObjectByName(AVATAR_NAME);
    if (avatar) {
      // Traverse all the skeleton and store position and rotation
      // Normalized time, starting since the voice command was fired
      const t = now - this.recordingStartTime;
      const state = getStoredAvatarState(
        t,
        this.transformationMatrix,
        this.scene.avatarStateSmoot,
        avatar,
      );
      this.history.a.push(state);
      //console.log(`${t} - this.history.a.length = ${this.history.a.length}`);
    }
    this.lastRecorded = now;
  }

  printPoint3D(p: Point3D) {
    return '[' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ' + p.z.toFixed(1) + ']';
  }

  async evaluateComparison() {
    if (!this.playing) {
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
    await this.applyRecording();
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

  override async onEvent(event: AvatarBodyEvent): Promise<void> {
    if (event.name == 'VOICE_COMMAND') {
      if (event.voiceCommand == 'start') {
        this.placeCamera(true);
        ModuloSonido.play('/assets/sounds/mail.mp3');
        this.recording = true;
        this.history = { v: AVATAR_ANIM_VERSION, a: [] };
        this.recordingStartTime = Date.now();
      } else if (event.voiceCommand == 'stop') {
        ModuloSonido.play('/assets/sounds/message.mp3');
        this.setHudValue('percentage', null, false);
        this.placeCamera(true);
        this.recording = false;
        this.playing = false;
        if (this.scene) {
          this.scene.animationStop();
        }
      } else if (event.voiceCommand == '...') {
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
      } else if (event.voiceCommand == 'play') {
        if (this.scene) {
          this.recording = false;
          this.playing = true;
          ModuloSonido.play('/assets/sounds/marimba_on.mp3');
          await this.assureCharacter();
          if (this.scenario?.dictionary && this.history.a.length == 0) {
            let oldName = this.scenario.dictionary[DICT_KEY];
            if (oldName) {
              await this.scene.applyAnimationToCharacter(NPC_NAME, {
                loop: true,
                startingTimeMillis: 0,
                animationUrl: oldName,
                lr: NPC_LR,
              });
            }
          } else {
            await this.scene.applyAnimationToCharacter(NPC_NAME, {
              loop: true,
              startingTimeMillis: 0,
              animationBin: this.history,
              lr: NPC_LR,
            });
          }
          this.placeCamera(false);
          this.scene.animationPlay();
        }
      } else if (event.voiceCommand == 'pause') {
        this.recording = false;
        this.playing = false;
        if (this.scene) {
          ModuloSonido.play('/assets/sounds/hangdown.mp3');
          this.scene.animationPause();
        }
      } else if (event.voiceCommand == 'save') {
        this.recording = false;
        ModuloSonido.play('/assets/sounds/message.mp3');
        if (this.history.a.length > 0) {
          this.saveAnimation();
        }
      }
    } else if (event.name == 'STAND2MATRIX') {
      if (event.data) {
        this.transformationMatrix = event.data;
      }
    } else if (event.name == 'START_ALL') {
      this.placeCamera(true);
    } else if (event.name == 'STOP_ALL') {
      this.setHudValue('percentage', null, false);
      if (this.scene) {
        this.playing = false;
        this.recording = false;
        this.scene.animationStop();
      }
    }
  }

  async saveAnimation() {
    if (!this.scenario) {
      return;
    }
    if (!this.scenario.dictionary) {
      this.scenario.dictionary = {};
    }
    // Read from the model
    let oldName = this.scenario.dictionary[DICT_KEY];
    const roomId = new URLSearchParams(location.hash.split('?')[1]).get('id');
    const nextName = getBucketPath(
      'avatar_animation/room/${roomId}/user/${user.uid}/${random}.bin',
      oldName ? oldName : '',
      {
        user: AuthService.userStatic,
        roomId,
      },
      true,
    );

    this.scenario.dictionary[DICT_KEY] = nextName;

    const encoded = encode(this.history);
    const blob = new Blob([encoded], { type: 'application/octet-stream' });

    await this.fileSrv.upload(nextName, blob, 'bucket');

    this.events.emit({
      name: 'SAVE_APPLY_SCENARIO',
      data: this.scenario,
    });
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

  downloadTextPlain(filename = 'animation.bin') {
    const encoded = encode(this.history);

    const blob = new Blob([encoded], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }
}
