//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { PanoConfig } from './threejs.component';

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
  panoramaAdded: boolean = false;

  canvasRef: HTMLCanvasElement;
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
    this.camera.position.z = 1;
    this.camera.position.y = 0;
    this.camera.position.x = 0;
    // setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    // sets up the camera's orbital controls
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitals.enableZoom = true; // default is true
    this.orbitals.zoomSpeed = 1.0;   // pinch zoom speed

    this.orbitals.autoRotate = true;
    this.orbitals.autoRotateSpeed = 0.5;
    this.orbitals.rotateSpeed = -0.5;
    this.orbitals.addEventListener('start', () => {
      if (this.orbitals) {
        this.orbitals.autoRotate = false;
      }
    });
    this.addPanorama();
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
  }

  async setConfig(configuration: PanoConfig) {
    this.configuration = configuration;
    await this.addPanorama();
  }

  async addPanorama() {
    if (!this.configuration || this.panoramaAdded) {
      return;
    }
    this.panoramaAdded = true;
    // get config json
    const promise: Wait = this.indicatorSrv.start();

    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      if (this.configuration) {
        loader.load(this.configuration.imageUrl, (texture) => {
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
      }
    });
  }
}
