//import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RecognizedCommand } from '@services/voicerecognition.service';

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
  bunnyLocation: PawLocation = { x: 0, y: 0 };
  bunnyObj: THREE.Object3D<THREE.Object3DEventMap> | null = null

  rotatingCoins: RotationType[] = [];

  virtualChessBoard: { [key: number]: { [key: number]: any } } = {
    0: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    1: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    2: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    3: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    4: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    5: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    6: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    7: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
  };

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
      50,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.z = 20;
    this.camera.position.y = 15;
    this.camera.position.x = 0;
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
    this.orbitals.enableRotate = false;
    this.orbitals.zoomSpeed = 1.0;   // pinch zoom speed

    this.background = new THREE.Color(0x333333);

    const ambient = new THREE.AmbientLight(0xefefef, 0.3);
    this.add(ambient);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1.5);
    //pointLight.castShadow = true;
    //pointLight.position.set(3, 5, -3);
    pointLight.position.set(0, 5, 0);
    this.add(pointLight);

    const ROOT_PATH = "https://storage.googleapis.com/pro-ejflab-assets/models3d/leftright/";

    const loading = this.indicatorSrv.start();
    this.addModel({ name: "chessboard", url: ROOT_PATH + "chessboard.glb", }, true).then(async (object) => {
      /*
      if (this.camera && this.orbitals) {
        this.fitCameraToObject(this.camera, object, this.orbitals);
      }
      */
      // Add coins
      const promises: Promise<any>[] = [];
      promises.push(this.addModel({ name: "", url: ROOT_PATH + "bunny_coffe5.glb", }, false));
      promises.push(this.addModel({ name: "", url: ROOT_PATH + "coin_cent2.glb", }, false));
      promises.push(this.addModel({ name: "", url: ROOT_PATH + "coin_dime2.glb", }, false));
      promises.push(this.addModel({ name: "", url: ROOT_PATH + "coin_five2.glb", }, false));
      promises.push(this.addModel({ name: "", url: ROOT_PATH + "coin_quarter2.glb", }, false));

      const responses = await Promise.all(promises);

      this.fillRandomChessBoard(responses);
      loading.done();
    });
  }

  isFreePosition(x: number, y: number) {
    return this.virtualChessBoard[x][y] === null;
  }

  setChessPosition(obj: THREE.Object3D<THREE.Object3DEventMap>, x: number, y: number) {
    this.virtualChessBoard[x][y] = { object: obj, x, y };
    obj.position.set((x - 3.5) * 1.6, 0, (3.5 - y) * 1.6); // move it 5 units along x
  }

  addCloneOnPosition(obj: THREE.Object3D<THREE.Object3DEventMap>, x: number, y: number) {
    const clone = obj.clone(true);
    this.setChessPosition(clone, x, y);
    this.add(clone);
    return clone;
  }

  animate() {
    const currentTime = performance.now();
    const delta = (currentTime - this.previousTime) / 1000;
    // Rotate coins
    this.rotatingCoins.forEach((coinData) => {
      coinData.rotation = 0.5 * (coinData.direction ? 1 : -1) * (delta * coinData.speed) % 360;
      coinData.obj.rotation.y = coinData.rotation * Math.PI / 180;
    });
  }

  getRandomNotBussyXY() {
    //Compute how many nulls exists
    let count = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this.virtualChessBoard[i][j] == null) {
          count++;
        }
      }
    }
    //Generate a random integer between 0 and count
    const picked = Math.floor(Math.random() * count);
    let index = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this.virtualChessBoard[i][j] == null) {
          if (index == picked) {
            return { x: i, y: j };
          }
          index++;
        }
      }
    }
    return null;
  }

  fillRandomChessBoard(assets: any[]) {
    // Place bunny
    const bunnyStart = this.getRandomNotBussyXY();
    if (!bunnyStart) {
      return;
    }
    this.bunnyLocation.x = bunnyStart.x;
    this.bunnyLocation.y = bunnyStart.y;
    this.bunnyObj = this.addCloneOnPosition(assets[0], bunnyStart.x, bunnyStart.y);

    // Place random coins, there are 4 types of coins
    for (let i = 0; i < 20; i++) {
      const coinPosition = this.getRandomNotBussyXY();
      if (coinPosition) {
        const coinType = i % 4 + 1;
        const coin = this.addCloneOnPosition(assets[coinType], coinPosition.x, coinPosition.y);
        this.rotatingCoins.push({
          direction: Math.floor((Math.random() * 10)) % 2 == 0,
          obj: coin,
          speed: 50 + Math.random() * 50,
          rotation: 0,
        });
      }
    }
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

  relocateBunny(x: number, y: number) {
    if (!this.bunnyObj) {
      return;
    }
    this.bunnyLocation.x = x;
    this.bunnyLocation.y = y;
    this.setChessPosition(this.bunnyObj, x, y);
  }

  executeCommand(command: RecognizedCommand) {
    if (command.command == "left") {
      this.bunnyLocation.x = this.bunnyLocation.x - 1;
      if (this.bunnyLocation.x < 0) {
        this.bunnyLocation.x = 0;
      }
      this.relocateBunny(this.bunnyLocation.x, this.bunnyLocation.y);
    } else if (command.command == "right") {
      this.bunnyLocation.x = this.bunnyLocation.x + 1;
      if (this.bunnyLocation.x >= 8) {
        this.bunnyLocation.x = 7;
      }
      this.relocateBunny(this.bunnyLocation.x, this.bunnyLocation.y);
    } else if (command.command == "up") {
      this.bunnyLocation.y = this.bunnyLocation.y + 1;
      if (this.bunnyLocation.y >= 8) {
        this.bunnyLocation.y = 7;
      }
      this.relocateBunny(this.bunnyLocation.x, this.bunnyLocation.y);
    } else if (command.command == "down") {
      this.bunnyLocation.y = this.bunnyLocation.y - 1;
      if (this.bunnyLocation.y < 0) {
        this.bunnyLocation.y = 0;
      }
      this.relocateBunny(this.bunnyLocation.x, this.bunnyLocation.y);
    }
  }
}
