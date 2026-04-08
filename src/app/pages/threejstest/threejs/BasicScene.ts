import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService } from '@services/indicator.service';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { replaceAvatarSkin } from './AvatarUtilities';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { BasicAvatarScene } from './SceneWithAvatar';
import { AnimatedElements, AVATAR_NAME, AvatarLocationState, StoredAvatarAnimation, StoredAvatarState } from '@mytypes/bodyTypes';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { decode } from "@msgpack/msgpack";

const ROOT_PATH = "/assets/models/";

export class BasicScene extends BasicAvatarScene {
  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  previousTime = performance.now();
  canvasRef: HTMLCanvasElement;
  avatarState: AvatarLocationState = {
    positionX: 0,
    positionZ: 0,
    rotationY: 0,
  };

  constructor(
    canvasRef: any,
    bounds: DOMRect,
    private indicatorSrv: IndicatorService,
    private http: HttpClient,
  ) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    const params = getUrlQueryParams();
    setInterval(() => {
      this.animationHeartBeat();
    }, 200);
  }

  initialize() {
    this.camera = new THREE.PerspectiveCamera(
      25,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.x = 10;
    this.camera.position.y = 5;
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.background = new THREE.Color(0x333333);
    this.initializeAvatar();
    this.initializeScenario();

    const light = new THREE.AmbientLight(0xFFFFFF);
    this.add(light);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1.5);
    pointLight.position.set(0, 5, 0);
    this.add(pointLight);

    //this.setHDRSky(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr");

    this.loadCharacters();
  }

  async initializeScenario() {
    const scenario = await this.addModel({ name: "scene", url: "/assets/models/scene2.gltf" });
    scenario.scale.set(1.5, 1.5, 1.5);
  }

  async initializeAvatar() {
    const loading = this.indicatorSrv.start();
    try {
      if (!this.camera || !this.renderer || !this.orbitals) {
        return;
      }
      await this.addAvatar(
        ROOT_PATH + "avatar005.glb",
        this.camera, this.renderer, this.orbitals);
      this.replaceAvatarSkin(ROOT_PATH + "squeleton.jpg");
    } catch (err) {

    } finally {
      loading.done();
    }
  }

  replaceAvatarSkin(url: string) {
    const avatar = this.getObjectByName(AVATAR_NAME);
    if (!avatar) {
      return;
    }
    replaceAvatarSkin(avatar, url);
  }

  animate() {
    const currentTime = performance.now();
    const delta = (currentTime - this.previousTime) / 1000;
  }

  setBounds(bounds: DOMRect) {
    this.bounds = bounds;
    if (this.camera == null || this.renderer == null) {
      return;
    }
    this.camera.aspect = this.bounds.width / this.bounds.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bounds.width, this.bounds.height);
  }

  executeCommand(command: RecognizedCommand) {
    console.log(command);
  }

  async loadAnimation(): Promise<StoredAvatarAnimation> {
    const loaded = await firstValueFrom(this.http.get(ROOT_PATH + "animations/animation.bin", { responseType: 'arraybuffer' }));
    const model = decode(loaded);
    return model as StoredAvatarAnimation;
  }

  async loadCharacters() {
    const autoAdd: boolean = true;
    this.addModel({ name: "friend", url: ROOT_PATH + "avatar005.glb", }, autoAdd).then(async (object) => {
      object.position.add(new THREE.Vector3(1, 1, -1));
      object.rotateY(Math.PI);

      // Load animation
      const anim = await this.loadAnimation();
      this.animatedElements.push({
        avatar: object,
        loop: true,
        startingTime: 0,
        state: anim,
      });
    });
  }

  animatedElements: AnimatedElements[] = [];
  startingAnimationTime: number = Date.now();

  animationHeartBeat() {
    const now = Date.now();
    const sceneTime = now - this.startingAnimationTime;
    for (let i = 0; i < this.animatedElements.length; i++) {
      const { avatar, state, loop, startingTime } = this.animatedElements[i];
      let { a, frameId } = state;
      // Busco el frame de acuerdo al tiempo

      let startingIndex = 0;
      if (frameId !== undefined) {
        startingIndex = frameId;
      }
      for (let j = 0; j < a.length; j++) {
        const pos = a[j];
        if (startingTime + pos.t > sceneTime) {
          state.frameId = j;
          // For performance optimization, Store the frameId!
          break;
        }
      }
      if (state.frameId != undefined && state.frameId >= 0) {
        this.applyAvatarState(avatar, a[state.frameId]);
      }
      if (loop) {
        if (state.frameId !== undefined) {
          if (state.frameId >= a.length - 1) {
            state.frameId = 0;
            this.animatedElements[i].startingTime = sceneTime;
          }
        }
      }
    }
  }

  applyAvatarState(
    avatar: THREE.Object3D<THREE.Object3DEventMap>,
    state: StoredAvatarState
  ) {
    for (let i = 0; i < state.bones.length; i++) {
      const { n, v } = state.bones[i];
      const boneTarget = avatar.getObjectByName(n);
      if (boneTarget) {
        boneTarget.position.set(v[0], v[1], v[2]);
        boneTarget.rotation.set(v[3], v[4], v[5]);
      }
    }
  }
}
