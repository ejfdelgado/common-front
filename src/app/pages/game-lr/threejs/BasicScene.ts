//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export interface ItemModelRef {
  url: string;
  name: string;
}

export class BasicScene extends THREE.Scene {
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  orbitals: OrbitControls | null = null;
  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  indicatorSrv: IndicatorService;
  fbxLoader = new FBXLoader();
  gltfLoader = new GLTFLoader();

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
      35,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.z = 10;
    this.camera.position.y = 10;
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
    this.orbitals.enableRotate = false;
    this.orbitals.zoomSpeed = 1.0;   // pinch zoom speed

    this.background = new THREE.Color(0xefefef);

    const light = new THREE.AmbientLight(0xefefef, 2);
    const hemiLight = new THREE.HemisphereLight(0xefefef, 0xefefef, 2);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);

    this.add(directionalLight);
    this.add(light);

    this.addModel({
      name: "chessboard",
      url: "https://storage.googleapis.com/labs-pro-public/models3d/leftright/chessboard.glb",
    }).then((object) => {
      if (this.camera && this.orbitals) {
        this.fitCameraToObject(this.camera, object, this.orbitals);
      }
    });
  }

  fitCameraToObject(
    camera: THREE.PerspectiveCamera,
    object: THREE.Object3D<THREE.Object3DEventMap>,
    controls: OrbitControls,
    offset = 1.25) {
    // Ensure world transforms are up to date
    object.updateWorldMatrix(true, true);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Get the largest dimension
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180); // convert to radians
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= offset; // add some padding

    // Compute direction from camera to center
    const direction = new THREE.Vector3()
      .subVectors(camera.position, center)
      .normalize();

    // Reposition camera
    camera.position.copy(center.clone().addScaledVector(direction, cameraZ));
    camera.lookAt(center);

    // Update near/far planes
    const minZ = box.min.z;
    const maxZ = box.max.z;
    camera.near = Math.max(0.1, cameraZ - maxDim * 2);
    camera.far = cameraZ + maxDim * 2;
    camera.updateProjectionMatrix();

    // Optional: update OrbitControls target
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }

  configureAutoRotate() {
    if (!this.orbitals) {
      return;
    }
    this.orbitals.autoRotate = true;
    this.orbitals.autoRotateSpeed = 0.5;
    this.orbitals.rotateSpeed = -0.5;
    this.orbitals.addEventListener('start', () => {
      if (this.orbitals) {
        this.orbitals.autoRotate = false;
      }
    });
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

  async addModel(
    item: ItemModelRef
  ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    return new Promise((resolve, reject) => {
      const url = item.url;
      const partes = /([^.]+)$/.exec(item.url.toLocaleLowerCase());
      // gets extension
      if (partes != null) {
        const MAPEO_LOADERS: { [key: string]: any } = {
          fbx: this.fbxLoader,
          glb: this.gltfLoader,
          gltf: this.gltfLoader,
        };
        const loader: any = MAPEO_LOADERS[partes[1]];
        if (loader) {
          loader.load(
            url,
            async (response: any) => {
              let object = null;
              if (loader == this.gltfLoader) {
                object = response.scene.children[0];
              } else {
                object = response;
              }
              if (object != null) {
                this.add(object);
              }
              resolve(object);
            },
            (xhr: any) => {
              console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error: any) => {
              reject(error);
            }
          );
        } else {
          alert(`No loader for ${item.url}`);
        }
      }
    });
  }
}
