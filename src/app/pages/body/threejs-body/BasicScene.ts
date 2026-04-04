import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { BodyData, BodyKeyPointData, BodyState } from './types';
import { WalkBody } from './WalkBody';
import { MyHelper } from './MyHelper';
import { MyAsset, MyAssetInData } from './MyAsset';
import { ModuloSonido } from '@services/sonido.service';

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
  // Poses
  poses: BodyData[] = [];
  states: BodyState[] = [];
  walk: WalkBody = new WalkBody();

  scaleBody: number = 3;
  offsetBody = new THREE.Vector3(0, 0, 0);
  bodyPointMapIndex: { [key: string]: number } = {};
  lineSegments: number[][] = [];
  lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  vector3DAll: THREE.Vector3[][] = [];
  bodyPointMeshes: THREE.Mesh[][] = [];
  bodyLines: THREE.Line[][] = [];
  lightFollow: THREE.PointLight = new THREE.PointLight(0xffffff, 200, 100);
  myAssets: MyAsset[] = [];

  canvasRef: HTMLCanvasElement;


  constructor(canvasRef: any, bounds: DOMRect) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
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
    this.camera.position.z = 30;
    this.camera.position.y = 30;
    this.camera.position.x = 30;

    // setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
    });
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    // sets up the camera's orbital controls
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    // Adds an origin-centered grid for visual reference
    if (addGridHelper) {
      // Adds a grid
      //this.add(new THREE.GridHelper(10, 10, 'red'));
      // Adds an axis-helper
      //this.add(new THREE.AxesHelper(3));
    }
    // set the background color
    this.background = new THREE.Color(0x000000);
    // create the lights
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.add(light);

    this.lightFollow.position.set(0, 15, 0);
    this.add(this.lightFollow);
    this.loadAllModels();

    // Setup events
    this.walk.makeClap.subscribe(this.clapEvent.bind(this));
  }

  async clapEvent(origin: WalkBody) {
    // traverse assets to check if there is collision
    for (let i = 0; i < this.myAssets.length; i++) {
      const asset = this.myAssets[i];
      if (asset.owner == null) {
        const matrix = origin.transformationMatrix;
        const test = origin.clapLocation.clone().applyMatrix4(matrix);
        const collision = asset.hasCollisionWith(test);
        if (collision) {
          ModuloSonido.play('/assets/sounds/mario-coin.mp3', false);
          asset.owner = "me";
        }
      }
    }
  }

  async loadAllModels() {
    const scenario = await MyHelper.loadGLTFModel("/assets/models/scene2.gltf");
    scenario.scale.set(6, 6, 6)
    this.add(scenario);

    const assets: MyAssetInData[] = [
      {
        url: "/assets/models/assets/ball.glb",
        height: 2,
      },
      {
        url: "/assets/models/assets/ball.glb",
        height: 2,
      },
      {
        url: "/assets/models/assets/ball.glb",
        height: 2,
      }
    ];

    assets.forEach((element) => {
      this.addAsset(element);
    })
  }

  async addAsset(data: MyAssetInData) {
    const nuevo = new MyAsset(data);
    await nuevo.initialize();
    const mesh = nuevo.getMesh();
    //nuevo.setPosition(-15, 0, true);
    nuevo.makeRandomPosition(new THREE.Vector2(-10, -10), new THREE.Vector2(10, 10));
    this.add(mesh);
    this.myAssets.push(nuevo);
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

  get3DBodyLines(index: number) {
    let response: THREE.Line[] = [];
    const scaledLandmarks: THREE.Vector3[] = this.vector3DAll[index];
    response = this.bodyLines[index];
    if (response == undefined) {
      response = this.lineSegments.map((segment, i) => {
        const points = [
          scaledLandmarks[segment[0]],
          scaledLandmarks[segment[0]]
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, this.lineMaterial);
        this.add(line);
        return line;
      });
      this.bodyLines[index] = response;
    } else {
      response.forEach((line, i) => {
        const segment = this.lineSegments[i];
        line.geometry.setFromPoints([
          scaledLandmarks[segment[0]],
          scaledLandmarks[segment[1]]
        ]);
        line.geometry.attributes['position'].needsUpdate = true;
      });
    }

    response.forEach((line, i) => {
      line.matrix = (this.walk.transformationMatrix);
      line.matrixAutoUpdate = false;
    });
  }

  get3DMeshBody(index: number): THREE.Mesh[] {
    let response: THREE.Mesh[] = [];
    const scaledLandmarks: THREE.Vector3[] = this.vector3DAll[index];
    response = this.bodyPointMeshes[index];

    if (response == undefined) {
      // Create spheres
      //console.log(`Create spheres ${index}`);
      response = scaledLandmarks.map(landmark => {
        const geometry = new THREE.SphereGeometry(0.07, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(landmark);
        this.add(sphere);
        return sphere;
      });
      this.bodyPointMeshes[index] = response;
    } else {
      //console.log(`Update spheres ${index}`);
      // Update spheres
      response.forEach((sphere, i) => {
        const position = new THREE.Vector3(scaledLandmarks[i].x, scaledLandmarks[i].y, scaledLandmarks[i].z);
        position.applyMatrix4(this.walk.transformationMatrix);
        sphere.position.set(
          position.x,
          position.y,
          position.z,
        );
      });
    }

    return response;
  }

  get3DVectorBody(index: number): { points: THREE.Vector3[], scores: number[] } {
    let response: THREE.Vector3[] = [];
    let scores: number[] = [];
    const originalData = this.poses[index];
    const original = originalData.keypoints3D;
    response = this.vector3DAll[index];

    // search the minimum y
    let maxY = original.reduce<number | null>((minimum, landmark, index) => {
      if (minimum == null) {
        return landmark.y;
      } else {
        if (landmark.y > minimum) {
          return landmark.y;
        } else {
          return minimum;
        }
      }
    }, null);
    if (maxY == null) {
      maxY = 0;
    }

    const transform = (landmark: BodyKeyPointData) => {
      return {
        y: (1 - (landmark.y - maxY + 1)) * this.scaleBody + this.offsetBody.y,//Up direction inverted
        z: landmark.x * this.scaleBody + this.offsetBody.x,
        x: landmark.z * this.scaleBody,
      };
    }

    if (response == undefined) {
      response = original.map(landmark => {
        const temp = transform(landmark);
        scores.push(landmark.score);
        return new THREE.Vector3(temp.x, temp.y, temp.z);
      });
      this.vector3DAll[index] = response;
    } else {
      // Replace values
      original.forEach((landmark, i) => {
        const temp = transform(landmark);
        scores[i] = landmark.score;
        response[i].set(temp.x, temp.y, temp.z);
      });
    }

    return {
      points: response,
      scores
    };
  }

  getBodyMapIndexes() {
    if (this.poses.length == 0 || Object.keys(this.bodyPointMapIndex).length > 0) {
      return this.bodyPointMapIndex;
    }
    const pose = this.poses[0];
    pose.keypoints3D.forEach((element, index) => {
      this.bodyPointMapIndex[element.name] = index;
    });
    const map = this.bodyPointMapIndex;

    // Face
    // Eyes
    this.lineSegments.push([map['left_ear'], map['left_eye']]);
    this.lineSegments.push([map['left_eye'], map['nose']]);
    this.lineSegments.push([map['nose'], map['right_eye']]);
    this.lineSegments.push([map['right_eye'], map['right_ear']]);
    // Eyes
    //this.lineSegments.push([map['left_eye_outer'], map['left_eye']]);
    //this.lineSegments.push([map['left_eye'], map['left_eye_inner']]);
    //this.lineSegments.push([map['right_eye_outer'], map['right_eye']]);
    //this.lineSegments.push([map['right_eye'], map['right_eye_inner']]);

    //Mouth
    this.lineSegments.push([map['mouth_left'], map['mouth_right']]);

    // Tronco
    this.lineSegments.push([map['left_shoulder'], map['right_shoulder']]);
    this.lineSegments.push([map['left_shoulder'], map['left_hip']]);
    this.lineSegments.push([map['right_shoulder'], map['right_hip']]);
    this.lineSegments.push([map['left_hip'], map['right_hip']]);

    // Brazo izquierdo
    this.lineSegments.push([map['left_shoulder'], map['left_elbow']]);
    this.lineSegments.push([map['left_elbow'], map['left_wrist']]);
    this.lineSegments.push([map['left_wrist'], map['left_thumb']]);
    this.lineSegments.push([map['left_wrist'], map['left_pinky']]);
    this.lineSegments.push([map['left_wrist'], map['left_index']]);
    this.lineSegments.push([map['left_pinky'], map['left_index']]);

    // Brazo derecho
    this.lineSegments.push([map['right_shoulder'], map['right_elbow']]);
    this.lineSegments.push([map['right_elbow'], map['right_wrist']]);
    this.lineSegments.push([map['right_wrist'], map['right_thumb']]);
    this.lineSegments.push([map['right_wrist'], map['right_pinky']]);
    this.lineSegments.push([map['right_wrist'], map['right_index']]);
    this.lineSegments.push([map['right_pinky'], map['right_index']]);

    // Pierna izquierda
    this.lineSegments.push([map['left_hip'], map['left_knee']]);
    this.lineSegments.push([map['left_knee'], map['left_ankle']]);
    this.lineSegments.push([map['left_ankle'], map['left_foot_index']]);
    this.lineSegments.push([map['left_ankle'], map['left_heel']]);
    this.lineSegments.push([map['left_heel'], map['left_foot_index']]);

    // Pierna derecha
    this.lineSegments.push([map['right_hip'], map['right_knee']]);
    this.lineSegments.push([map['right_knee'], map['right_ankle']]);
    this.lineSegments.push([map['right_ankle'], map['right_foot_index']]);
    this.lineSegments.push([map['right_ankle'], map['right_heel']]);
    this.lineSegments.push([map['right_heel'], map['right_foot_index']]);

    return this.bodyPointMapIndex;
  }

  updatePoses(poses: BodyData[], states: BodyState[]) {
    // Assure it only gets the body with highest overall score
    this.poses = poses.sort((a, b) => {
      return b.score - a.score;
    }).filter((a, i) => i == 0);
    this.states = states;

    this.getBodyMapIndexes();
    for (let i = 0; i < poses.length; i++) {
      const score = Math.round(100 * poses[i].score);
      if (this.states[i] == undefined) {
        this.states[i] = {
          data: {
            stepCount: 0,
            kilometers: 0,
            calories: 0,
            score,
          }
        };
      }
      const { points, scores } = this.get3DVectorBody(i);
      this.walk.capture(points, this.bodyPointMapIndex, this.states[i], scores);
      if (this.camera) {
        this.walk.placeCamera(this.camera, this.states[i]);
        this.walk.placeLight(this.lightFollow, this.states[i]);
      }
      this.get3DMeshBody(i);
      this.get3DBodyLines(i);
    }
  }


}
