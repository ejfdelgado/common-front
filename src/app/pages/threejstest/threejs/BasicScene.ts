import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService } from '@services/indicator.service';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { replaceAvatarSkin } from '@avatar/AvatarUtilities';
import { getUrlQueryParams } from '@tools/UrlUtil';
import {
  AVATAR_NAME,
  AvatarLocationState,
  ROOT_PATH,
} from '@mytypes/bodyTypes';
import { HttpClient } from '@angular/common/http';
import { CameraByPassShader } from '@avatar/shaders/CameraByPass';
import { ComposerAvatarScene } from '@avatar/ComposerAvatarScene';

export class BasicScene extends ComposerAvatarScene {

  lights: Array<THREE.Light> = [];

  previousTime = performance.now();
  canvasRef: HTMLCanvasElement;
  avatarState: AvatarLocationState = {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationY: 0,
  };
  avatarStateSmoot: AvatarLocationState = {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationY: 0,
  };

  constructor(
    canvasRef: any,
    bounds: DOMRect,
    private indicatorSrv: IndicatorService,
    override http: HttpClient,
  ) {
    super(bounds, http);
    this.canvasRef = canvasRef;
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

  executeCommand(command: RecognizedCommand) {
    console.log(command);
  }


}
