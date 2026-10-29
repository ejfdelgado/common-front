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
      iniciar: 'start',
      detener: 'stop',
    });
    commandsMap.set('en-US', {
      start: 'start',
      stop: 'stop',
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
      const state = getStoredAvatarState(
        now - this.recordingStartTime,
        this.transformationMatrix,
        this.scene.avatarStateSmoot,
        avatar,
      );
      console.log(`this.history.a.length = ${this.history.a.length}`);
    }
    this.lastRecorded = now;
    return {};
  }

  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'VOICE_COMMAND') {
      if (event.voiceCommand == 'start') {
        ModuloSonido.play('/assets/sounds/mail.mp3');
        this.recording = true;
        this.history = { v: AVATAR_ANIM_VERSION, a: [] };
        this.recordingStartTime = Date.now();
      } else if (event.voiceCommand == 'stop') {
        this.recording = false;
        if (this.history.a.length > 0) {
          this.downloadTextPlain();
        }
      }
    } else if (event.name == 'STAND2MATRIX') {
      if (event.data) {
        this.transformationMatrix = event.data;
      }
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
