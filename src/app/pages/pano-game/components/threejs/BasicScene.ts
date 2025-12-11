//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { PanoConfig } from './threejs.component';
import { QuestionDataType } from '../question/question';
import { isMobile } from '@tools/mobile';
import { GyroReturnType } from './types';
import { DeviceOrientationControlsGPT } from "./DeviceOrientationControlsGPT";

const BASE_BUCKET = `https://storage.googleapis.com/pro-ejflab-assets`;

/**
 * A class to set up some basic scene elements to minimize code in the
 * main execution file.
 */
export class BasicScene extends THREE.Scene {
  // A dat.gui class debugger that is added by default
  //debugger: GUI = null;
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
  controls: DeviceOrientationControlsGPT | null = null;
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
    this.camera.up.set(0, 0, 1);

    //this.camera.position.set(0, 1.6, 0); this.camera.lookAt(0, 1.6, 1);
    this.camera.position.set(0, 0, 0); this.camera.lookAt(0, 0, -1);

    if (this.hasMobile) {
      this.camera.position.z = 0.01;
      this.controls = new DeviceOrientationControlsGPT(this.camera);
    } else {
      this.camera.position.z = 1;
      // sets up the camera's orbital controls
      this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
      this.orbitals.enableDamping = true;
    }

    // Stereo effect (splits the screen)
    this.effect = new StereoEffect(this.renderer);
  }

  localRender(useStereo: boolean, cameraMain: boolean = true) {
    if (this.controls) {
      this.controls.update();
    }
    this.camera?.updateMatrixWorld(true);
    this.camera?.updateProjectionMatrix();

    if (this.effect && this.camera) {
      if (useStereo) {
        this.effect?.render(this, this.camera);
      } else {
        this.renderer?.render(this, this.camera);
      }
    }
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
      this.controls.connect();
    }
  }

  disableGyro() {
    this.controls?.disconnect();
  }
}
