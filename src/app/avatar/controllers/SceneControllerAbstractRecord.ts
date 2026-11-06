import { AVATAR_ANIM_VERSION, AVATAR_NAME, MAX_STATES_PER_SECOND, StoredAvatarAnimation } from 'src/types/BodyTypes';
import { SceneControllerAbstract } from './SceneControllerAbstract';
import * as THREE from 'three';
import { getStoredAvatarState } from '../utils/AvatarUtilities';
import { getBucketPath } from 'src/app/tools/BucketPaths';
import { AuthService } from 'src/app/services/auth.service';
import { encode } from '@msgpack/msgpack';
import { uploadAnimationToBucket } from '../utils/AnimationUtiles';

export abstract class SceneControllerAbstractRecord extends SceneControllerAbstract {
  state: "STOPED" | "RECORDING" | "PLAYING" | "PAUSED" = "STOPED";
  recordingStartTime: number = 0;
  lastRecorded: number = 0;
  history: StoredAvatarAnimation = { v: AVATAR_ANIM_VERSION, a: [] };
  transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

  async applyRecording(): Promise<void> {
    const now = Date.now();
    const difference = now - this.lastRecorded;
    if (this.state != "RECORDING" || difference < 1000 / MAX_STATES_PER_SECOND) {
      return;
    }
    // Leer el modelo
    const avatar = this.scene.getObjectByName(AVATAR_NAME);
    if (avatar) {
      const t = now - this.recordingStartTime;
      const state = getStoredAvatarState(
        t,
        this.transformationMatrix,
        this.scene.avatarStateSmoot,
        avatar,
      );
      this.history.a.push(state);
    }
    this.lastRecorded = now;
  }

  async saveAnimation(dictKey: string) {
    if (!this.scenario) {
      return;
    }
    if (!this.scenario.dictionary) {
      this.scenario.dictionary = {};
    }
    // Read from the model
    let oldName = this.scenario.dictionary[dictKey];
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

    this.scenario.dictionary[dictKey] = nextName;

    await uploadAnimationToBucket(nextName, this.history, this.fileSrv);

    this.events.emit({
      name: 'SAVE_APPLY_SCENARIO',
      data: this.scenario,
    });
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
