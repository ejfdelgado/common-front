import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TextureLoader } from 'three';
const textureLoader = new TextureLoader();

const ROOT_PATH = "/assets/models/";

export interface ActorType {
  object: any;
  alias: string;
  x: number;
  y: number;
};

export interface ItemModelRef {
  url: string;
  name: string;
};

export interface RotationType {
  direction: boolean;
  obj: any;
  speed: number;
  rotation: number;
}

export interface PawLocation {
  x: number;
  y: number;
};

export class BasicScene extends THREE.Scene {
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  orbitals: OrbitControls | null = null;
  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  indicatorSrv: IndicatorService;
  fbxLoader = new FBXLoader();
  gltfLoader = new GLTFLoader();
  previousTime = performance.now();

  canvasRef: HTMLCanvasElement;
  constructor(canvasRef: any, bounds: DOMRect, indicatorSrv: IndicatorService) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    this.indicatorSrv = indicatorSrv;
    const params = this.getUrlQueryParams();
  }
  /**
   * Initializes the scene by adding lights, and the geometry
   */
  initialize(debug: boolean = true, addGridHelper: boolean = true) {
    // setup camera
    this.camera = new THREE.PerspectiveCamera(
      20,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.x = -30;
    this.camera.position.y = 15;
    this.camera.position.z = 0;
    // setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    //this.renderer.shadowMap.enabled = true;
    //this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Optional: softer shadows
    // sets up the camera's orbital controls
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitals.enableZoom = true; // default is true
    this.orbitals.enableRotate = true;
    this.orbitals.zoomSpeed = 1.0;   // pinch zoom speed

    this.background = new THREE.Color(0x333333);

    const loading = this.indicatorSrv.start();
    this.addModel({ name: "avatar", url: ROOT_PATH + "avatar003.glb", }, true).then(async (object) => {
      if (this.camera && this.orbitals) {
        this.fitCameraToObject(this.camera, object, this.orbitals);
      }
      this.replaceSkin(object, "avatar.jpg");
      loading.done();
    });

    new HDRLoader().load(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      this.environment = texture;
      this.background = texture;
      this.environmentIntensity = 0.3;
    });
  }


  getUrlQueryParams() {
    return new URLSearchParams(window.location.hash.split("?")[1]);
  }

  animate() {
    const currentTime = performance.now();
    const delta = (currentTime - this.previousTime) / 1000;
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
    item: ItemModelRef, autoAdd: boolean = true
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
                //console.log(response.scene.children);
                /*
                const group = new THREE.Object3D(); // or new THREE.Group();
                response.scene.children.forEach((obj: any) => group.add(obj));
                object = group;
                */
                object = response.scene.children[0];
              } else {
                object = response;
              }
              //object.name = item.name;
              if (object != null) {
                if (autoAdd) {
                  this.inspectObject(object);
                  this.add(object);
                }
              }
              resolve(object);
            },
            (xhr: any) => {
              //console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
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

  inspectObject(model: THREE.Object3D<THREE.Object3DEventMap>) {
    const temp: THREE.Object3D = model;
    const children = temp.children;
    model.traverse((child: any) => {
      if (child.isMesh) {
        console.log("Mesh material:", child.material);
      }
      if (child.isBone || child.type === 'Bone') {
        console.log("Bone found:", child.name, child);
      }
    });
    let skinnedMesh: THREE.SkinnedMesh | null = null;

    // Find the SkinnedMesh
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type == 'SkinnedMesh') {
        skinnedMesh = child as THREE.SkinnedMesh;
      }
    }
  }

  replaceSkin(model: THREE.Object3D<THREE.Object3DEventMap>, textureUrl: string) {
    const newTexture = textureLoader.load(ROOT_PATH + textureUrl);
    newTexture.colorSpace = THREE.SRGBColorSpace;
    newTexture.flipY = false;
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = newTexture;
        child.material.needsUpdate = true;
      }
    });
  }
}
