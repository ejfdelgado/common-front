//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { PanoConfig } from './threejs.component';
import { QuestionDataType } from '../question/question';
import { isMobile } from '@tools/mobile';
import { DeviceOrientationControls } from "./DeviceOrientationControls";
import { GyroReturnType } from './types';
import { GyroControls } from './GyroControls';

const BASE_BUCKET = `https://storage.googleapis.com/pro-ejflab-assets`;

/**
 * A class to set up some basic scene elements to minimize code in the
 * main execution file.
 */
export class BasicScene extends THREE.Scene {
  // A dat.gui class debugger that is added by default
  //debugger: GUI = null;
  debugCamera: THREE.PerspectiveCamera | null = null;
  debugCameraHelper: THREE.CameraHelper | null = null;
  // Setups a scene camera
  camera: THREE.PerspectiveCamera | null = null;
  // setup renderer
  renderer: THREE.WebGLRenderer | null = null;
  // setup Orbitals
  orbitals: OrbitControls | null = null;
  // Holds the lights for easy reference
  lights: Array<THREE.Light> = [];
  // Number of PointLight objects around origin
  lightCount: number = 6;
  // Distance above ground place
  lightDistance: number = 3;
  // Get some basic params
  bounds: DOMRect;
  indicatorSrv: IndicatorService;
  configuration: PanoConfig | null = null;

  canvasRef: HTMLCanvasElement;
  effect: StereoEffect | null = null;
  controls: GyroControls | DeviceOrientationControls | null = null;
  hasMobile = isMobile();

  constructor(canvasRef: any, bounds: DOMRect, indicatorSrv: IndicatorService) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    this.indicatorSrv = indicatorSrv;
  }
  /**
   * Initializes the scene by adding lights, and the geometry
   */
  initialize(debug: boolean = true, addGridHelper: boolean = true) {
    // setup camera
    this.camera = new THREE.PerspectiveCamera(
      95,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );

    // setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.bounds.width, this.bounds.height);

    this.camera.rotation.order = "YXZ";
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);

    if (this.hasMobile) {
      this.camera.position.z = 0.01;
      //this.controls = new GyroControls(this.camera);
      this.controls = new DeviceOrientationControls(this.camera);
    } else {
      this.camera.position.z = 1;
      // sets up the camera's orbital controls
      this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
      this.orbitals.enableDamping = true;
    }

    // Stereo effect (splits the screen)
    this.effect = new StereoEffect(this.renderer);
  }

  addHelpers() {
    const grid = new THREE.GridHelper(10, 10);
    this.add(grid);

    // --- 2. AXES HELPER ---
    const axes = new THREE.AxesHelper(3); // size 2 units
    this.add(axes);

    // --- 3. AXIS LABELS ---
    const addLabel = (text: string, position: THREE.Vector3, color: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 128;

      ctx.fillStyle = color;
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      const localScale = 2;
      sprite.scale.set(0.5 * localScale, 0.25 * localScale, 1 * localScale);
      sprite.position.copy(position);
      this.add(sprite);
    };

    // X (red)
    addLabel('X', new THREE.Vector3(2.2, 0, 0), '#000000ff');

    // Y (green)
    addLabel('Y', new THREE.Vector3(0, 2.2, 0), '#000000ff');

    // Z (blue)
    addLabel('Z', new THREE.Vector3(0, 0, 2.2), '#000000ff');

    this.debugCamera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Place the debug camera somewhere where it can “see” the main camera
    this.debugCamera.position.set(5, 5, 5);
    this.debugCamera.lookAt(0, 0, 0);

    if (this.camera) {
      this.debugCameraHelper = new THREE.CameraHelper(this.camera);
      this.add(this.debugCameraHelper);
    }
  }

  localRender(useStereo: boolean, cameraMain: boolean = true) {
    let gyroData: GyroReturnType | undefined;
    if (this.controls) {
      gyroData = this.controls.update();
    }
    this.camera?.updateMatrixWorld(true);
    this.camera?.updateProjectionMatrix();
    this.debugCamera?.updateProjectionMatrix();
    this.orbitals?.update();

    if (this.effect && this.camera && this.debugCamera) {
      if (useStereo) {
        this.effect?.render(this, cameraMain ? this.camera : this.debugCamera);
      } else {
        this.renderer?.render(this, cameraMain ? this.camera : this.debugCamera);
      }
    }
    this.debugCameraHelper?.update();
    return gyroData;
  }

  /**
   * Given a ThreeJS camera and renderer, resizes the scene if the
   * browser window is resized.
   * @param camera - a ThreeJS PerspectiveCamera object.
   * @param renderer - a subclass of a ThreeJS Renderer object.
   */
  setBounds(bounds: DOMRect) {
    this.bounds = bounds;
    if (this.camera == null || this.renderer == null) {
      return;
    }
    this.camera.aspect = this.bounds.width / this.bounds.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    if (this.effect) {
      this.effect.setSize(window.innerWidth, window.innerHeight);
    }
  }

  async setConfig(configuration: PanoConfig) {
    this.configuration = configuration;
  }

  async addPanorama(question: QuestionDataType) {
    // get config json
    const promise: Wait = this.indicatorSrv.start();

    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(BASE_BUCKET + question.photo, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        // 3. Optional: Create cube render target if you want environment reflections
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(texture.image.height / 2);
        if (this.renderer) {
          cubeRenderTarget.fromEquirectangularTexture(this.renderer, texture);
        }
        // 4. Set as scene background
        this.background = texture;
        // Optional: Use as environment for reflective materials
        this.environment = texture;
        promise.done();
        resolve(null);
      });
    });
  }

  async enableGyro() {
    if (typeof DeviceOrientationEvent !== "undefined" &&
      (DeviceOrientationEvent as any).requestPermission) {

      const perm = await (DeviceOrientationEvent as any).requestPermission();
      if (perm !== "granted") {
        alert("Gyro permission denied");
        return;
      }
    }
    if (this.controls) {
      this.controls.enable();
    }
  }

  disableGyro() {
    this.controls?.disable();
  }
}
