//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { isMobile } from '@tools/mobile';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ItemModelRef } from '@mytypes/BodyTypes';

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

  fbxLoader = new FBXLoader();
  gltfLoader = new GLTFLoader();

  constructor(canvasRef: any, bounds: DOMRect, indicatorSrv: IndicatorService) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    this.indicatorSrv = indicatorSrv;
  }


  initialize() {
    // setup camera
    this.camera = new THREE.PerspectiveCamera(
      35,
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
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    // sets up the camera's orbital controls
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitals.enableDamping = true;

    const ambient = new THREE.AmbientLight(0xefefef, 1);
    this.add(ambient);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1.5);
    pointLight.position.set(0, 5, 0);
    this.add(pointLight);

    const promises: Promise<THREE.Object3D<THREE.Object3DEventMap>>[] = [];
    promises.push(this.addModel({
      name: "pugTextured",
      url: "/assets/models/pug.glb"
    }, true));
    promises.push(this.addModel({
      name: "pugOther",
      url: "/assets/models/pug2.glb"
    }, true));
  }

  replacePugSkin(
    canvas: HTMLCanvasElement,
  ) {
    const model = this.getObjectByName("pugTextured");
    if (!model) {
      return;
    }
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.colorSpace = THREE.SRGBColorSpace;
    newTexture.flipY = false;
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = newTexture;
        /*
        child.material.metalness = 0.0;
        child.material.roughness = 0.8;
        */
        child.material.needsUpdate = true;
      }
    });
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

  async addModel(
    item: ItemModelRef, autoAdd: boolean = true
  ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    return new Promise(async (resolve, reject) => {
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
          const object = (await this.loadWithCache(loader, url));
          object.name = item.name;
          if (object != null) {
            if (autoAdd) {
              //inspectAvatarObject(object);
              this.add(object);
            }
          }
          resolve(object);
        } else {
          console.error(`No loader for ${item.url}`);
        }
      }
    });
  }

  async loadWithCache(loader: any, url: string): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    const promise = new Promise<any>((resolve, reject) => {
      loader.load(
        url,
        async (response: any) => {
          let object = null;
          if (loader == this.gltfLoader) {
            //console.log(response.scene.children[0]);
            /*
            const group = new THREE.Object3D(); // or new THREE.Group();
            response.scene.children.forEach((obj: any) => group.add(obj));
            object = group;
            */
            object = response.scene.children[0];
          } else {
            object = response;
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
    });
    return promise;
  }
}
