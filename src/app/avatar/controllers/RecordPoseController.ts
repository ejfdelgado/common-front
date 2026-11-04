import {
  ControllerUpdateResponse,
  AvatarBodyEvent,
  AVATAR_NAME,
  StoredAvatarAnimation,
  AVATAR_ANIM_VERSION,
} from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import { encode } from '@msgpack/msgpack';
import * as THREE from 'three';
import { getStoredAvatarState } from '@avatar/utils/AvatarUtilities';
import { ControlProxy } from '../workers/ControlProxy';
import { P2PService } from 'src/app/services/p2p.service';
import { EventEmitter } from '@angular/core';
import { ModuloSonido } from 'src/app/services/sonido.service';
import { VoiceLangType, VoiceRecognitionService } from 'src/app/services/voicerecognition.service';
import { BUCKET_PATH } from '../SceneWithAvatar';
import { getBucketPath } from 'src/app/tools/BucketPaths';
import { AuthService } from 'src/app/services/auth.service';

const NPC_NAME = 'dancer';
const NPC_LR = [2, 0, 0];

export class RecordPoseController extends SceneControllerAbstract {
  recording: boolean = false;
  recordingStartTime: number = 0;
  lastRecorded: number = 0;
  MAX_STATES_PER_SECOND: number = 10;
  history: StoredAvatarAnimation = { v: AVATAR_ANIM_VERSION, a: [] };
  transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

  constructor(
    public override events: EventEmitter<AvatarBodyEvent>,
    public override controlProxy: ControlProxy,
    public override p2pSrv: P2PService,
    public voiceRecognitionSrv: VoiceRecognitionService,
  ) {
    super(events, controlProxy, p2pSrv);
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

  override async update(): Promise<ControllerUpdateResponse> {
    const now = Date.now();
    const difference = now - this.lastRecorded;
    if (!this.recording || difference < 1000 / this.MAX_STATES_PER_SECOND) {
      return {};
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
    return {};
  }

  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  override async onEvent(event: AvatarBodyEvent): Promise<void> {
    if (event.name == 'VOICE_COMMAND') {
      if (event.voiceCommand == 'start') {
        ModuloSonido.play('/assets/sounds/mail.mp3');
        this.recording = true;
        this.history = { v: AVATAR_ANIM_VERSION, a: [] };
        this.recordingStartTime = Date.now();
      } else if (event.voiceCommand == 'stop') {
        this.placeCamera(true);
        this.recording = false;
        if (this.scene) {
          this.scene.animationStop();
        }
      } else if (event.voiceCommand == 'load') {
        if (this.scene) {
          await this.scene.loadCharacter(
            {
              name: NPC_NAME,
              meshName: 'esqueleto009_1_web.glb',
              animations: {},
            },
            false,
          );
          // TODO, place at some position with some animation
          const anim = await this.scene.applyAnimationToCharacter(NPC_NAME, {
            loop: false,
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
          this.placeCamera(false);
          this.scene.animationPlay();
        }
      } else if (event.voiceCommand == 'pause') {
        if (this.scene) {
          this.scene.animationPause();
        }
      } else if (event.voiceCommand == 'save') {
        //if (this.history.a.length > 0) {
          this.saveAnimation();
        //}
      }
    } else if (event.name == 'STAND2MATRIX') {
      if (event.data) {
        this.transformationMatrix = event.data;
      }
    }
  }

  saveAnimation() {
    const DICT_KEY = 'animation_stored';
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
    console.log(`nextName = ${nextName}`);
    this.scenario.dictionary[DICT_KEY] = nextName;
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
        fov: 30,
        lookAt: {
          x: single ? 0 : NPC_LR[0] / 2,
          y: 1,
          z: 0,
        },
        position: {
          x: single ? 0 : NPC_LR[0] / 2,
          y: 1,
          z: 5,
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
