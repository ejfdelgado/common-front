import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  CursorPositioner,
  GenericSizeType,
  HudDisplatType,
  ScenePoseAndWalkEventType,
} from '@mytypes/BodyTypes';
import { EventEmitter } from '@angular/core';
import { SceneWithComposer } from '../SceneWithComposer';
import { ControllerInitDataType } from '@mytypes/BodyTypesExtra';
import { ControlProxy } from '../workers/ControlProxy';
import { P2PService } from '@services/p2p.service';
import { computeDistance } from '@avatar/utils/AvatarUtilities';
import { BUCKET_ROOT, GameMode, GameScenario, LOCAL_AUDIO_PREFIX } from 'src/types/WorldAvatar';
import { FileService } from 'src/app/services/file.srv';
import { ModuloSonido } from 'src/app/services/sonido.service';

export abstract class SceneControllerAbstract {
  enabled: boolean = true;
  now: number = 0;
  scene!: SceneWithComposer;
  lastData!: ScenePoseAndWalkEventType;
  videoSize!: GenericSizeType;
  cursorDisplay: CursorPositioner | null = null;
  mode: GameMode | null = null;
  scenario: GameScenario | null = null;

  constructor(
    public events: EventEmitter<AvatarBodyEvent>,
    public controlProxy: ControlProxy,
    public p2pSrv: P2PService,
    public fileSrv: FileService,
  ) {}

  async initialize(data: ControllerInitDataType) {
    this.scene = data.scene;
  }

  async preUpdate(data: ScenePoseAndWalkEventType): Promise<void> {
    this.lastData = data;
    this.videoSize = data.videoSize;
    this.now = new Date().getTime();
  }

  abstract update(): Promise<ControllerUpdateResponse>;

  async postUpdate(): Promise<void> {
    return;
  }

  computeDistanceByName(aName: string, bName: string) {
    const a = this.lastData.keypoints3DMap[aName];
    const b = this.lastData.keypoints3DMap[bName];
    return computeDistance(a, b);
  }

  abstract stop(): Promise<void>;

  abstract destroy(): Promise<void>;

  abstract onEvent(event: AvatarBodyEvent): void;

  setCursorDisplay(cursorDisplay: CursorPositioner) {
    this.cursorDisplay = cursorDisplay;
  }

  setParams(params: { [key: string]: any }) {
    Object.assign(this, params);
  }

  setMode(mode: GameMode) {
    this.mode = mode;
  }

  setScenario(scenario: GameScenario) {
    this.scenario = scenario;
  }

  async setHudValue(key: HudDisplatType, val: any, speak?: boolean) {
    await this.cursorDisplay?.setHudDisplay({
      key: key,
      value: val,
      speak: speak,
      lang: this.scenario?.language,
    });
  }

  async preloadAudios() {
    const audios: string[] = [];
    if (this.scenario?.audio) {
      const audioKeys = ['intro', 'loop', 'finish', 'loose', 'success'];
      for (let i = 0; i < audioKeys.length; i++) {
        const audioKey = audioKeys[i];
        const val = (this.scenario.audio as any)[audioKey];
        if (val) {
          if (val.startsWith(LOCAL_AUDIO_PREFIX)) {
            audios.push(val);
          } else {
            audios.push(BUCKET_ROOT + val);
          }
        }
      }
    }
    await ModuloSonido.preload(audios);
  }

  async playAudio(
    type: 'intro' | 'loop' | 'finish' | 'loose' | 'success',
    removeLoop: boolean = false,
  ) {
    if (!this.scenario?.audio) {
      return { promise: Promise.resolve() };
    }
    const val = (this.scenario?.audio as any)[type];
    if (!val) {
      return { promise: Promise.resolve() };
    }
    const whiteList: string[] = [];
    if (!removeLoop) {
      const loop = this.scenario?.audio.loop;
      if (loop) {
        if (loop.startsWith(LOCAL_AUDIO_PREFIX)) {
          whiteList.push(loop);
        } else {
          whiteList.push(BUCKET_ROOT + loop);
        }
      }
    }
    ModuloSonido.stopAll(whiteList);
    if (val.startsWith(LOCAL_AUDIO_PREFIX)) {
      return await ModuloSonido.play(val, type == 'loop');
    } else {
      return await ModuloSonido.play(BUCKET_ROOT + val, type == 'loop');
    }
  }
}
