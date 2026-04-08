import { BasicScene } from 'app/pages/threejstest/threejs/BasicScene';
import { WalkBody } from 'app/pages/threejstest/threejs/WalkBody';
import * as THREE from 'three';

export interface BodyKeyPointData {
    x: number;
    y: number;
    z: number;
    score: number;
    name: string;
}

export interface BodyData {
    score: number;
    keypoints: BodyKeyPointData[];
    keypoints3D: BodyKeyPointData[];
}

export interface BodyState {
    data: any;
}

export interface FrontComputationType {
    x: number;
    z: number;
    angle: number;
    angle_deg: number;
};

export interface BoneBackupType {
    boneName: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
}

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

export interface ScenePoseEventType {
    pose: BodyData,
    keypoints3DMap: {
        [key: string]: BodyKeyPointData;
    },
    frontData: FrontComputationType,
}

export interface ScenePoseAndWalkEventType extends ScenePoseEventType {
    walkBody: WalkBody,
    videoSize: GenericSizeType,
    keypoints2DMap: {
        [key: string]: BodyKeyPointData;
    },
}

export interface ControllerInitDataType {
    scene: BasicScene,
}

export interface AvatarBodyEvent {
    name: string;
    voiceCommand?: string;
    data?: any;
}

export interface GenericSizeType {
    width: number;
    height: number;
};

export interface ControllerUpdateResponse {
    avatarTransform?: THREE.Matrix4;
}

export const AVATAR_NAME = "avatar";

export interface AvatarLocationState {
    positionX: number,
    rotationY: number;
    positionZ: number,
}

export interface StoredAvatarBoneState {
    n: string;
    v: number[]; //px,py,pz,rx,ry,rz
}

export interface StoredAvatarState {
    t: number;
    bones: StoredAvatarBoneState[],
    matrix: number[],
    lr: number[],//positionX, positionZ, rotationY
    d?: number;
}

export interface StoredAvatarAnimation {
    a: StoredAvatarState[];
    frameId?: number;
    lr?: number[],// If this is assigned, the state is overrided with this
}

export interface AnimatedElements {
    avatar: THREE.Object3D<THREE.Object3DEventMap>;
    state: StoredAvatarAnimation,
    startingTime: number;
    loop: boolean;
}