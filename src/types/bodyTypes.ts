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
    y: number;
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