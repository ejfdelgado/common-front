import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService } from '@services/indicator.service';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { arrayToMatrix, replaceAvatarSkin } from './AvatarUtilities';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { BasicAvatarScene } from './SceneWithAvatar';
import { AnimatedElements, AVATAR_NAME, AvatarLocationState, StoredAvatarAnimation, StoredAvatarState } from '@mytypes/bodyTypes';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { decode } from "@msgpack/msgpack";
import { CameraByPassShader } from './shaders/CameraByPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

const ROOT_PATH = "/assets/models/";

export class BasicScene extends BasicAvatarScene {

  composer: EffectComposer | null = null;
  outlinePass: OutlinePass | null = null;

  animatedElements: AnimatedElements[] = [];
  startingAnimationTime: number = Date.now();

  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  previousTime = performance.now();
  canvasRef: HTMLCanvasElement;
  avatarState: AvatarLocationState = {
    positionX: 0,
    positionZ: 0,
    rotationY: 0,
  };
  avatarStateSmoot: AvatarLocationState = {
    positionX: 0,
    positionZ: 0,
    rotationY: 0,
  };

  terrainMeshes: THREE.Mesh[] = [];

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
    }, 100);
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
    this.background = new THREE.Color(0xBBBBFF);

    this.setupEffects();

    this.initializeAvatar();
    this.initializeScenario();

    const light = new THREE.AmbientLight(0xFFFFFF);
    this.add(light);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1.5);
    pointLight.position.set(0, 5, 0);
    this.add(pointLight);

    //this.setHDRSky(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr");

    //this.loadCharacters();
  }

  setupEffects() {
    if (!this.camera || !this.renderer) {
      return;
    }
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this,
      this.camera
    );
    this.configureHalo(this.outlinePass);
    this.composer.addPass(this.outlinePass);
    const smaaPass = new SMAAPass();
    this.composer.addPass(smaaPass);
  }

  configureHalo(outlinePass: OutlinePass) {
    outlinePass.edgeStrength = 3.0;
    outlinePass.edgeGlow = 2.0;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set('#00ffff'); // halo color
    outlinePass.hiddenEdgeColor.set('#000000');
  }

  async initializeScenario() {
    const scenario = await this.addModel({ name: "scene", url: "/assets/models/scenario.glb" });
    scenario.scale.set(1.5, 1.5, 1.5);

    if (this.camera) {
      const shader = CameraByPassShader(this.camera, 0, 15, 30, 45);
      scenario.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material: any) => {
            material.transparent = true;
            material.side = THREE.FrontSide;
            material.onBeforeCompile = shader;
          });
        }
        if (child.name.startsWith("terrain_")) {
          this.terrainMeshes.push(child);
        }
      });
    }
    //
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

  // the resize event is fired here
  setBounds(bounds: DOMRect) {
    this.bounds = bounds;
    if (this.camera == null || this.renderer == null || this.composer == null) {
      return;
    }
    const pixelRatio = window.devicePixelRatio;

    this.camera.aspect = this.bounds.width / this.bounds.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    this.composer.setSize(this.bounds.width, this.bounds.height);
    this.renderer.setPixelRatio(pixelRatio);
    this.composer.setPixelRatio(pixelRatio);

    if (this.outlinePass) {
      this.outlinePass.setSize(this.bounds.width, this.bounds.height);
    }
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
      // Load animation
      const anim = await this.loadAnimation();

      anim.lr = [2, 2, Math.PI];

      this.animatedElements.push({
        avatar: object,
        loop: true,
        startingTime: 0,
        state: anim,
      });

      if (this.outlinePass) {
        this.outlinePass.selectedObjects = [object];
      }
    });
  }

  animationHeartBeat() {
    const now = Date.now();
    const sceneTime = now - this.startingAnimationTime;
    for (let i = 0; i < this.animatedElements.length; i++) {
      const { avatar, state, loop, startingTime } = this.animatedElements[i];
      let { a, frameId, lr } = state;
      // Busco el frame de acuerdo al tiempo

      let startingIndex = 0;
      if (frameId !== undefined) {
        startingIndex = frameId;
      }
      for (let j = 0; j < a.length; j++) {
        const pos = a[j];
        if (startingTime + pos.t > sceneTime) {
          state.frameId = j;
          break;
        }
      }
      if (state.frameId != undefined && state.frameId >= 0) {
        this.applyAvatarState(avatar, a[state.frameId], lr);
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
    state: StoredAvatarState,
    lr?: number[],
  ) {
    for (let i = 0; i < state.bones.length; i++) {
      const { n, v } = state.bones[i];
      const boneTarget = avatar.getObjectByName(n);
      if (boneTarget) {
        boneTarget.position.set(v[0], v[1], v[2]);
        boneTarget.rotation.set(v[3], v[4], v[5]);
      }
    }
    avatar.matrixAutoUpdate = false;
    const result = new THREE.Matrix4().identity();
    const matrixTransforms: THREE.Matrix4[] = [];

    let positionX = state.lr[0];
    let positionZ = state.lr[1];
    let rotationY = state.lr[2];

    let useFixedGlobalLocRot = false;
    if (lr && lr.length == 3) {
      positionX = lr[0];
      positionZ = lr[1];
      rotationY = lr[2];
      useFixedGlobalLocRot = true;
    }
    const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationY);

    const translationMatrix = new THREE.Matrix4().makeTranslation(
      positionX,
      0,// Check height with terrain
      positionZ,
    );

    // Location
    matrixTransforms.push(translationMatrix);
    // Rotation
    matrixTransforms.push(rotationMatrix);
    // Local displacement
    const matrix = arrayToMatrix(state.matrix);
    matrixTransforms.push(matrix);

    for (const m of matrixTransforms) {
      result.multiply(m);
    }
    avatar.matrix.copy(result);
  }

  getFirstHitFromTopToDown(x: number, z: number) {
    let highestY: number = 0;
    for (let i=0; i<this.terrainMeshes.length; i++) {
      
    }
    return highestY;
  }
}
