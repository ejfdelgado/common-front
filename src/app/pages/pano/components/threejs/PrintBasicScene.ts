import * as THREE from 'three';
import { PanoConfig } from './threejs.component';
import { IndicatorService } from "@services/indicator.service";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

export interface QRConfig {
  pg: number,
  x: number,
  y: number,
  w: number,
  h: number,
};

export interface PrintConfig {
  zoom: number,
  root: string,
  objFile: string,
  mtlFile: string,
  width: number,
  height: number,
  materialName: string,
  center: {
    x: number,
    z: number,
  },
};

/**
 * A class to set up some basic scene elements to minimize code in the
 * main execution file.
 */
export class PrintBasicScene extends THREE.Scene {
  // A dat.gui class debugger that is added by default
  //debugger: GUI = null;
  // Setups a scene camera
  camera: THREE.OrthographicCamera | null = null;
  // setup renderer
  renderer: THREE.WebGLRenderer | null = null;
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
  objectLoaded: boolean = false;
  printConfig: PrintConfig;

  canvasRef: HTMLCanvasElement;
  constructor(canvasRef: any, printConfig: PrintConfig, indicatorSrv: IndicatorService) {
    super();
    this.printConfig = printConfig;
    this.canvasRef = canvasRef;
    this.bounds = new DOMRect(0, 0, printConfig.width, printConfig.height);
    this.indicatorSrv = indicatorSrv;
  }
  /**
   * Initializes the scene by adding lights, and the geometry
   */
  async initialize(configuration: PanoConfig) {
    // setup camera

    const viewSize = this.printConfig.zoom;
    const aspect = this.bounds.width / this.bounds.height;

    this.camera = new THREE.OrthographicCamera(
      -aspect * viewSize / 2, // left
      aspect * viewSize / 2, // right
      viewSize / 2,          // top
      -viewSize / 2,          // bottom
      0.1,                    // near
      1000                    // far
    );

    this.background = new THREE.Color(0xffffff);

    this.camera.position.set(this.printConfig.center.x, 100, this.printConfig.center.z);
    this.camera.lookAt(this.printConfig.center.x, 0, this.printConfig.center.z);
    // setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.bounds.width, this.bounds.height);

    await this.addObject(configuration);
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
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bounds.width, this.bounds.height);
  }

  async setConfig(configuration: PanoConfig) {
    this.configuration = configuration;
    await this.initialize(configuration);
  }

  makeRender() {
    if (this.camera) {
      this.camera.updateProjectionMatrix();
      this.renderer?.render(this, this.camera);
    }
  }

  async addObject(configuration: PanoConfig): Promise<void> {
    let step1 = false;
    let step2 = false;
    return new Promise((resolve, reject) => {
      const imageUrl = configuration.imageUrl;
      const mtlLoader = new MTLLoader();
      const root = `${location.origin}${this.printConfig.root}`;
      mtlLoader.setPath(root);
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(imageUrl, () => {
        step1 = true;
        this.makeRender();
        if (step1 && step2) {
          resolve();
        }
      });
      //texture.flipY = true;
      texture.repeat.set(-1, 1);   // mirror horizontally
      texture.offset.x = 1;        // shift back into view
      const newMaterial = new THREE.MeshBasicMaterial({
        map: texture
      });
      newMaterial.side = THREE.DoubleSide;
      mtlLoader.load(this.printConfig.mtlFile, (materials) => {
        materials.materials[this.printConfig.materialName] = newMaterial;
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(root);
        objLoader.load(this.printConfig.objFile, (object) => {
          this.add(object);
          this.makeRender();
          step2 = true;
          if (step1 && step2) {
            resolve();
          }
        },
          (xhr) => {
            console.log(`OBJ loading: ${xhr.loaded / xhr.total * 100}% loaded`);
          },
          (error) => {
            console.error('Error loading OBJ:', error);
            reject(error);
          });
      }, (event: ProgressEvent) => {
        console.log(`Material loading: ${event.loaded / event.total * 100}% loaded`);
      }, (err: any) => {
        reject(err);
      });
    });
  }

  static disposeScene(scene: THREE.Scene) {
    scene.traverse((object) => {
      // Dispose geometry
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;

        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        // Dispose material(s)
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(material);
        }
      }
    });

    // Optional: remove all children from the scene
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
    }
  }

  static disposeMaterial(material: THREE.Material) {
    // Dispose texture maps
    for (const key in material) {
      const value = (material as any)[key];
      if (value && value instanceof THREE.Texture) {
        value.dispose();
      }
    }

    material.dispose();
  }
}
