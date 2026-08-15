import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBoneEnum } from "@mytypes/BodyParts";
import {
  ControllerUpdateResponse,
  AvatarBodyEvent,
  AVATAR_NAME,
} from "@mytypes/BodyTypes";
import { ControllerInitDataType } from "src/types/BodyTypesExtra";
import * as THREE from "three";

const OPACITY_LOW = 0.5;
const OPACITY_HIGH = 1;

const SIDE_SHIFT = 0.5;
const SIDE_FRONT = 0.3;
const AB_HEIGHT = 0.5;
const VERTICAL_SHIFT = -0.8; //-0.5
const CUBE_BOX_Z_SCALE = 3; // stretches the collision box 3x along local z

export type ENABLE_CUBE_TYPE =
  | "CUBE_A_ON"
  | "CUBE_B_ON"
  | "CUBE_C_ON"
  | "CUBE_D_ON";

export interface MinMaxCubeRange {
  x?: {
    min: number;
    max: number;
  };
  y?: {
    min: number;
    max: number;
  };
  z?: {
    min: number;
    max: number;
  };
}

export interface CubeConfigType {
  local_x: number;
  local_y: number;
  local_z: number;
  local: THREE.Matrix4;
  height: number;
  collisionBounds: any;
  minmax?: MinMaxCubeRange;
  model: THREE.Object3D<THREE.Object3DEventMap> | null | undefined;
  material: any;
  selected: boolean;
  eventName: string;
  rotationPeriod: number;
}

export class CubeController extends SceneControllerAbstract {
  canListen: boolean = false;
  cubes: {
    [key: string]: CubeConfigType;
  } = {
    cube_a: {
      local_x: SIDE_SHIFT,
      local_y: 0,
      local_z: SIDE_FRONT,
      eventName: "CUBE_A_SELECT_",
      local: new THREE.Matrix4().makeTranslation(0, 0, 0),
      height: AB_HEIGHT,
      collisionBounds: null,
      model: null,
      material: null,
      selected: true,
      rotationPeriod: 0,
    },
    cube_b: {
      local_x: -1 * SIDE_SHIFT,
      local_y: 0,
      local_z: SIDE_FRONT,
      eventName: "CUBE_B_SELECT_",
      local: new THREE.Matrix4().makeTranslation(0, 0, 0),
      height: AB_HEIGHT,
      collisionBounds: null,
      model: null,
      material: null,
      selected: true,
      rotationPeriod: 0,
    },
    cube_c: {
      local_x: SIDE_SHIFT,
      local_y: VERTICAL_SHIFT,
      local_z: 0,
      eventName: "CUBE_C_SELECT_",
      local: new THREE.Matrix4().makeTranslation(0, 0, 0),
      height: 0.1,
      collisionBounds: null,
      model: null,
      material: null,
      selected: true,
      rotationPeriod: 0,
    },
    cube_d: {
      local_x: -1 * SIDE_SHIFT,
      local_y: VERTICAL_SHIFT,
      local_z: 0,
      eventName: "CUBE_D_SELECT_",
      local: new THREE.Matrix4().makeTranslation(0, 0, 0),
      height: 0.1,
      collisionBounds: null,
      model: null,
      material: null,
      selected: true,
      rotationPeriod: 0,
    },
  };

  override setParams(params: { [key: string]: any }) {
    // Dangerous but flexible
    super.setParams(params);
    if (!this.enabled) {
      this.setVisibility(false);
    }
  }

  override async initialize(data: ControllerInitDataType) {
    super.initialize(data);
    for (let name in this.cubes) {
      const cube = this.cubes[name];
      cube.local = new THREE.Matrix4().makeTranslation(
        cube.local_x,
        cube.local_y,
        cube.local_z,
      );
    }
  }

  setVisibility(val: boolean, name?: string) {
    const fun = (name: string) => {
      const config = this.getCubeConfig(name);
      if (!config || !config.model) {
        return;
      }
      config.model.visible = val;
    };
    if (name) {
      fun(name);
    } else {
      Object.keys(this.cubes).forEach((name: string) => {
        fun(name);
      });
    }
  }

  setOpacity(val: number, name?: string) {
    const fun = (name: string) => {
      const config = this.getCubeConfig(name);
      if (!config) {
        return;
      }
      config.material.opacity = val;
    };
    if (name) {
      fun(name);
    } else {
      Object.keys(this.cubes).forEach((name: string) => {
        fun(name);
      });
    }
  }

  randomize(min: number, max: number) {
    const rand = Math.random();
    const inverse = 1 - rand;
    return rand * min + inverse * max;
  }

  setCubeData(name: string, data?: any) {
    const config = this.getCubeConfig(name);
    if (!config) {
      return;
    }
    if (data && data.minmax) {
      // Redefine min max
      config.minmax = data.minmax;
      // Compute new location
      let x = config.local_x;
      let y = config.local_y;
      let z = config.local_z;
      if (config.minmax?.x) {
        x = this.randomize(config.minmax.x.min, config.minmax.x.max);
      }
      if (config.minmax?.y) {
        y = this.randomize(config.minmax.y.min, config.minmax.y.max);
      }
      if (config.minmax?.z) {
        z = this.randomize(config.minmax.z.min, config.minmax.z.max);
      }
      config.local = new THREE.Matrix4().makeTranslation(x, y, z);
    }
    if (typeof data.rotationPeriod == "number") {
      config.rotationPeriod = data.rotationPeriod;
    } else {
      config.rotationPeriod = 0;
    }
  }

  computeBoundingBox(
    cubeObject: THREE.Object3D<THREE.Object3DEventMap>,
    config: CubeConfigType,
  ) {
    cubeObject.traverse((mesh: any) => {
      if (mesh.isMesh) {
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox.clone();
        const scaleMatrix = new THREE.Matrix4().makeScale(
          1,
          1,
          CUBE_BOX_Z_SCALE,
        );
        const worldMatrix = mesh.matrixWorld.clone().multiply(scaleMatrix);
        box.applyMatrix4(worldMatrix);
        config.collisionBounds = box;
        if (mesh.material) {
          config.material = mesh.material;
        }
      }
    });
  }

  getCubeConfig(name: string): CubeConfigType | null | undefined {
    const config = this.cubes[name];
    let cubeObject = config.model;
    if (!cubeObject) {
      cubeObject = this.scene.getObjectByName(name);
      config.model = cubeObject;
    }
    if (!cubeObject) {
      return;
    }
    this.computeBoundingBox(cubeObject, config);
    return config;
  }

  // It runs every frame...
  override async update(): Promise<ControllerUpdateResponse> {
    if (!this.enabled || !this.lastData) {
      return {};
    }
    const rotationMatrix = new THREE.Matrix4().makeRotationY(
      this.scene.avatarStateSmoot.rotationY,
    );
    const now = Date.now();
    Object.keys(this.cubes).forEach((name: string) => {
      const config = this.getCubeConfig(name);
      if (!config) {
        return;
      }
      let cubeObject = config.model;
      if (!cubeObject) {
        return;
      }

      const tx = this.scene.avatarStateSmoot.positionX;
      const ty =
        this.lastData.stateBody.height * config.height +
        this.scene.avatarState.positionY;
      const tz = this.scene.avatarStateSmoot.positionZ;

      const translationMatrix = new THREE.Matrix4().makeTranslation(tx, ty, tz);

      const cubeAMatrix = new THREE.Matrix4().identity();
      cubeAMatrix.multiply(translationMatrix);
      cubeAMatrix.multiply(rotationMatrix);
      cubeAMatrix.multiply(config.local);
      // Make a rotation with period
      const rotationPeriod = config.rotationPeriod;
      if (rotationPeriod != 0) {
        // Here multiply
        const spinAmount = (now % Math.abs(rotationPeriod)) / rotationPeriod;
        const spinMatrix = new THREE.Matrix4().makeRotationY(
          2 * Math.PI * spinAmount,
        );
        cubeAMatrix.multiply(spinMatrix);
      }
      cubeObject.matrixAutoUpdate = false;
      cubeObject.matrix.copy(cubeAMatrix);

      this.computeBoundingBox(cubeObject, config);
    });

    return {};
  }

  override async postUpdate() {
    if (!this.enabled) {
      return;
    }
    const model = this.scene.getObjectByName(AVATAR_NAME);
    if (!model) {
      return;
    }
    const handL = model.getObjectByName(AvatarBoneEnum.hand_l);
    const handR = model.getObjectByName(AvatarBoneEnum.hand_r);
    const footL = model.getObjectByName(AvatarBoneEnum.foot_l);
    const footR = model.getObjectByName(AvatarBoneEnum.foot_r);
    if (!handL || !handR || !footL || !footR) {
      return;
    }
    const leftHandPoint = new THREE.Vector3();
    const rightHandPoint = new THREE.Vector3();
    const leftFootPoint = new THREE.Vector3();
    const rightFootPoint = new THREE.Vector3();
    handL.getWorldPosition(leftHandPoint);
    handR.getWorldPosition(rightHandPoint);
    footL.getWorldPosition(leftFootPoint);
    footR.getWorldPosition(rightFootPoint);
    Object.keys(this.cubes).forEach((name: string) => {
      const config = this.cubes[name];
      const { collisionBounds } = config;
      if (!collisionBounds) {
        return;
      }
      let isInSphere = collisionBounds.containsPoint(leftHandPoint);
      if (!isInSphere) {
        isInSphere = collisionBounds.containsPoint(rightHandPoint);
      }
      if (!isInSphere) {
        isInSphere = collisionBounds.containsPoint(leftFootPoint);
      }
      if (!isInSphere) {
        isInSphere = collisionBounds.containsPoint(rightFootPoint);
      }

      if (isInSphere) {
        if (config.model) {
          this.scene.highlightOn(config.model);
        }
        if (!config.selected) {
          if (this.canListen && config.model?.visible) {
            config.material.opacity = OPACITY_HIGH;
            config.selected = true;
            this.events.emit({
              name: config.eventName + "ON",
            });
          }
        }
      } else {
        if (config.model) {
          this.scene.highlightOff(config.model);
        }
        if (config.selected) {
          if (this.canListen && config.model?.visible) {
            config.material.opacity = OPACITY_LOW;
            config.selected = false;
            this.events.emit({
              name: config.eventName + "OFF",
            });
          }
        }
      }
    });
  }

  override async stop(): Promise<void> {}

  override async destroy(): Promise<void> {}

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == "CUBE_CONTROLL_ON") {
      this.setParams({ enabled: true });
    } else if (event.name == "CUBE_CONTROLL_OFF") {
      this.setParams({ enabled: false });
    } else if (event.name == "CUBE_LISTEN_ON") {
      this.setParams({ canListen: true });
    } else if (event.name == "CUBE_LISTEN_OFF") {
      this.setParams({ canListen: false });
    } else if (event.name == "CUBE_A_ON") {
      this.setVisibility(true, "cube_a");
      this.setOpacity(OPACITY_LOW, "cube_a");
      if (event.data) {
        this.setCubeData("cube_a", event.data);
      }
    } else if (event.name == "CUBE_B_ON") {
      this.setVisibility(true, "cube_b");
      this.setOpacity(OPACITY_LOW, "cube_b");
      if (event.data) {
        this.setCubeData("cube_b", event.data);
      }
    } else if (event.name == "CUBE_C_ON") {
      this.setVisibility(true, "cube_c");
      this.setOpacity(OPACITY_LOW, "cube_c");
      if (event.data) {
        this.setCubeData("cube_c", event.data);
      }
    } else if (event.name == "CUBE_D_ON") {
      this.setVisibility(true, "cube_d");
      this.setOpacity(OPACITY_LOW, "cube_d");
      if (event.data) {
        this.setCubeData("cube_d", event.data);
      }
    }
  }
}

