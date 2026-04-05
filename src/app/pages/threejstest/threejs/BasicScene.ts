import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService } from '@services/indicator.service';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { replaceAvatarSkin } from './AvatarUtilities';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { BasicAvatarScene } from './SceneWithAvatar';

const ROOT_PATH = "/assets/models/";

export class BasicScene extends BasicAvatarScene {
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  orbitals: OrbitControls | null = null;
  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  previousTime = performance.now();
  canvasRef: HTMLCanvasElement;

  constructor(
    canvasRef: any,
    bounds: DOMRect,
    private indicatorSrv: IndicatorService,
  ) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    const params = getUrlQueryParams();
  }

  initialize() {
    this.camera = new THREE.PerspectiveCamera(
      10,
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
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitals.enableZoom = true;
    this.orbitals.enableRotate = true;
    this.orbitals.zoomSpeed = 1.0;
    this.background = new THREE.Color(0x333333);
    this.initializeAvatar();
    this.setHDRSky(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr");
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
    const avatar = this.getObjectByName("avatar");
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
}
