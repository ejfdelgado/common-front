//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { isMobile } from '@tools/mobile';

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

  canvasRef: HTMLCanvasElement;
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


    this.camera.position.z = 1;
    // sets up the camera's orbital controls
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitals.enableDamping = true;
  }

  localRender() {
    if (!this.camera) {
      return;
    }
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();

    this.renderer?.render(this, this.camera);
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

  animate() {

  }
}
