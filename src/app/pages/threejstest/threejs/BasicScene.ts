import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as THREE from 'three';
import { IndicatorService, Wait } from '@services/indicator.service';



import { BodyData, BodyKeyPointData, BoneBackupType, FrontComputationType, ItemModelRef } from '@mytypes/bodyTypes';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { computeAvatarFront, computeAvatarScore, fitCameraToObject, getAvatarSkinnedMesh, getHigherAvatarScoredPose, inspectAvatarObject, replaceAvatarSkin, setRotationBoneLocation } from './AvatarUtilities';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { BasicAvatarScene } from './SceneWithAvatar';

const ROOT_PATH = "/assets/models/";

export class BasicScene extends BasicAvatarScene {
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  orbitals: OrbitControls | null = null;
  lights: Array<THREE.Light> = [];
  bounds: DOMRect;
  previousTime = performance.now();
  canvasRef: HTMLCanvasElement;

  computingIK: boolean = false;
  originalPelvisRotation: THREE.Euler | null = null;

  BONE_MAP_ORIGINAL_ROTATION: Map<string, THREE.Euler> = new Map();

  constructor(
    canvasRef: any,
    bounds: DOMRect,
    private indicatorSrv: IndicatorService,
  ) {
    super();
    this.canvasRef = canvasRef;
    this.bounds = bounds;
    const params = getUrlQueryParams();
  }
  /**
   * Initializes the scene by adding lights, and the geometry
   */
  initialize(debug: boolean = true, addGridHelper: boolean = true) {
    // setup camera
    this.camera = new THREE.PerspectiveCamera(
      10,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.x = 10;
    this.camera.position.y = 5;
    this.camera.position.z = 10;
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
    this.addModel({ name: "avatar", url: ROOT_PATH + "avatar005.glb", }, true).then(async (object) => {
      if (this.camera && this.orbitals) {
        //fitCameraToObject(this.camera, object, this.orbitals);
      }
      replaceAvatarSkin(object, ROOT_PATH + "avatar.jpg");
      loading.done();

      //this.setRotationBoneAnglesDegrees(object, "footR", 0, 0, 0);
      //this.setRotationBoneAnglesDegrees(object, "legR", 0, 0, -90);
      //this.setRotationBoneAnglesDegrees(object, "handR", 0, 0, 0);//Z: -150 -> 0
      //this.setRotationBoneAnglesDegrees(object, "handL", 0, 0, -150);//Z: -150 -> 0

      const skinnedMesh = getAvatarSkinnedMesh(object);
      if (skinnedMesh && this.camera && this.renderer && this.orbitals) {
        this.configureIK(object, skinnedMesh, false, this.camera, this.renderer, this.orbitals);
        if (this.ikSolver) {
          this.ikSolver.update();
        }
      }

      /*
      //Piernas al frente y abiertas
      this.setRotationBoneAnglesDegrees(object, "legL", 0, -45, -90);
      this.setRotationBoneAnglesDegrees(object, "legR", 0, -45, 90);
      // Rodillas flexionadas
      this.setRotationBoneAnglesDegrees(object, "footL", 0, 0, 90);
      this.setRotationBoneAnglesDegrees(object, "footR", 0, 0, -90);
      // Antebrazo al frente
      this.setRotationBoneAnglesDegrees(object, "armL", 0, 0, -90);
      this.setRotationBoneAnglesDegrees(object, "armR", 0, 0, -90);
      // Brasos flexionados
      this.setRotationBoneAnglesDegrees(object, "handL", 0, 0, -90);
      // Tronco
      this.setRotationBoneAnglesDegrees(object, "trunk", 45, 0, 0);
      //Cabeza
      this.setRotationBoneAnglesDegrees(object, "head", 0, 0, 45);
      // Pelvis
      // Esto posiciona el cuerpo y lo rota?
      this.setRotationBoneAnglesDegrees(object, "pelvis", 0, -45, 0);
      */
      //setRotationBoneLocation(object, "pelvis", 0, 0, 0);

    });

    new HDRLoader().load(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      this.environment = texture;
      this.background = texture;
      this.environmentIntensity = 0.3;
    });
  }

  animate() {
    const currentTime = performance.now();
    const delta = (currentTime - this.previousTime) / 1000;
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

  setRotationBoneAnglesDegrees(
    model: THREE.Object3D<THREE.Object3DEventMap>,
    boneName: string,
    x: number,
    y: number,
    z: number,
  ) {
    const bone = model.getObjectByName(boneName);
    if (bone && ((bone as any).isBone || bone.type === 'Bone')) {
      if (!this.BONE_MAP_ORIGINAL_ROTATION.has(boneName)) {
        this.BONE_MAP_ORIGINAL_ROTATION.set(boneName, bone.rotation.clone());
      }
      const originalRotation = this.BONE_MAP_ORIGINAL_ROTATION.get(boneName);
      if (originalRotation) {
        console.log(`Original rotation for ${boneName}:`);
        console.log(THREE.MathUtils.radToDeg(originalRotation.x), THREE.MathUtils.radToDeg(originalRotation.y), THREE.MathUtils.radToDeg(originalRotation.z));
        bone.rotation.set(
          originalRotation.x + THREE.MathUtils.degToRad(x),
          originalRotation.y + THREE.MathUtils.degToRad(y),
          originalRotation.z + THREE.MathUtils.degToRad(z)
        );
      }
    } else {
      console.warn(`Bone ${boneName} not found.`);
    }
  }

  async computeIK(poses: BodyData[]) {
    if (this.computingIK || poses.length == 0) {
      return;
    }
    this.computingIK = true;
    try {
      if (this.restoreBackupOnNextComputation) {
        this.restoreBoneBackup();
        this.restoreBackupOnNextComputation = false;
      }
      const model = this.getObjectByName("avatar");
      const { pose, score } = getHigherAvatarScoredPose(poses);
      if (score < 90) {
        // Not all body in view
        this.computingIK = false;
        this.restoreBackupOnNextComputation = true;
        return;
      }
      if (!model || !pose) {
        this.computingIK = false;
        return;
      }

      const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
      pose.keypoints3D.forEach((sourceData) => {
        const sourceCoord = new THREE.Vector3(sourceData.x, sourceData.y, sourceData.z);
        sourceCoord.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
        sourceCoord.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(14));
        sourceData.x = sourceCoord.x;
        sourceData.y = sourceCoord.y;
        sourceData.z = sourceCoord.z;
      });
      // Generate map
      pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
      });

      const computeAverage = (name: string, list: BodyKeyPointData[]) => {
        const avg: BodyKeyPointData = {
          name, score: 0, x: 0, y: 0, z: 0
        };
        const size = list.length;
        list.forEach((el) => {
          avg.x += el.x;
          avg.y += el.y;
          avg.z += el.z;
          avg.score += el.score;
        });
        avg.x = avg.x / size;
        avg.y = avg.y / size;
        avg.z = avg.z / size;
        avg.score = avg.score / size;
        return avg;
      }

      // Generate front vector
      const pelvisBone = model.getObjectByName("pelvis");
      if (pelvisBone) {
        const frontData = computeAvatarFront(keypoints3DMap);
        if (this.originalPelvisRotation == null) {
          this.originalPelvisRotation = pelvisBone.rotation.clone();
        }
        const delta = -1 * (frontData.angle + Math.PI / 2);
        pelvisBone.rotation.y = this.originalPelvisRotation.y + delta;
      }

      // avg(left_shoulder, right_shoulder) => target_chest
      pose.keypoints3D.push(computeAverage("target_chest", [
        keypoints3DMap["right_shoulder"],
        keypoints3DMap["left_shoulder"],
      ]));
      // avg(left_ear, right_ear) => target_head
      pose.keypoints3D.push(computeAverage("target_head", [
        keypoints3DMap["right_ear"],
        keypoints3DMap["left_ear"],
      ]));

      pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
      });

      const MAPPING_TARGETS = [
        { "source": "left_knee", "target": "target_kneeL" },
        { "source": "left_heel", "target": "target_footL" },
        { "source": "right_knee", "target": "target_kneeR" },
        { "source": "right_heel", "target": "target_footR" },
        //
        { "source": "right_shoulder", "target": "target_elbowR" },
        { "source": "right_elbow", "target": "target_armR" },
        { "source": "right_wrist", "target": "target_handR" },
        { "source": "left_shoulder", "target": "target_elbowL" },
        { "source": "left_elbow", "target": "target_armL" },
        { "source": "left_wrist", "target": "target_handL" },
        //
        { "source": "target_chest", "target": "target_chest" },
        { "source": "target_head", "target": "target_head" },
      ];
      for (let i = 0; i < MAPPING_TARGETS.length; i++) {
        const { source, target } = MAPPING_TARGETS[i];
        const targetBone = model.getObjectByName(target);
        const sourceData = keypoints3DMap[source];
        if (!sourceData || !targetBone) {
          continue;
        }

        targetBone.position.x = sourceData.x;
        targetBone.position.y = sourceData.y;
        targetBone.position.z = sourceData.z;
      }
      if (this.ikSolver) {
        this.ikSolver.update();
      } else {
        console.log("No ikSolver!");
      }
    } catch (err) {
      console.log(err);
    } finally {
      this.computingIK = false;
    }
  }

  executeCommand(command: RecognizedCommand) {
    if (command.command == "restore") {
      this.restoreBackupOnNextComputation = true;
    }
  }
}
