import * as THREE from 'three';
import { FingerPinch, HandIdType } from './BodyParts';
import { LandmarkList, NormalizedLandmarkList } from '@mediapipe/pose';


export const ROOT_PATH = "/assets/models/";

export interface Point2D {
    x: number;
    y: number;
};

export interface Point3D {
    x: number;
    y: number;
    z: number;
};

export interface BodyKeyPointData extends Point3D {
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
    front: Point3D,
    left: Point3D,
    up: Point3D,
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

export interface SimpleComparable {
    leftArm: Point3D;
    rightArm: Point3D;
    leftLeg: Point3D;
    rightLeg: Point3D;
    leftHand: Point3D;
    rightHand: Point3D;
    handL: number;
    handR: number;
    armL: number;
    armR: number;
    footL: number;
    footR: number;
};

export interface ScenePoseEventType {
    pose: BodyData,
    keypoints3DMap: {
        [key: string]: BodyKeyPointData;
    },
    frontData: FrontComputationType;
}

export interface ScenePoseAndWalkEventType extends ScenePoseEventType {
    stateBody: StateBody,
    videoSize: GenericSizeType,
    keypoints2DMap: {
        [key: string]: BodyKeyPointData;
    },
    keypoints3DMap: {
        [key: string]: BodyKeyPointData;
    },
    hands: Map<HandIdType, {
        score: number,
        multiHandLandmarks: NormalizedLandmarkList,
        multiHandWorldLandmarks: LandmarkList,
    }>
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
    comparable?: ComparableBody;
}

export const AVATAR_NAME = "avatar";
export const AVATAR_PELVIS_HEIGHT = 0.88;

export interface AvatarLocationState {
    positionX: number;
    positionY: number;
    positionZ: number;
    rotationY: number;
}

export interface StoredAvatarBoneState {
    n: string;
    v: number[]; //px,py,pz,rx,ry,rz
}

export interface StoredAvatarState {
    t: number;//millis
    bones: StoredAvatarBoneState[],
    matrix: number[],
    lr: number[],//positionX, positionZ, rotationY
    d?: number;
}

export interface StoredAvatarAnimation {
    v: string;
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

export const AVATAR_ANIM_VERSION = "1.0";

export interface ComparableBody extends SimpleComparable {
    front: Point3D;
    up: Point3D;
    left: Point3D;
}

export interface StateBody {
    height: number;
    isTPose: boolean;
    front: Point3D;
    up: Point3D;
    left: Point3D;
    comparable: ComparableBody;
}

export interface WorkerData {
    poses: BodyData[];
    videoSize: GenericSizeType;
    mirror: boolean;
}

export interface AnimationSpecType {
    animationUrl: string,
    loop: boolean,
    lr?: number[],
}

export interface HandPinchData {
    handId: HandIdType;
    finger: FingerPinch;
    pinchState: boolean;
}

export type CursorDataSide = "L" | "R";

export interface CursorData {
    x: number;
    y: number;
    type: CursorDataSide;
}

export interface CursorStateData {
    type: CursorDataSide;
    state: "on" | "off";
}

export interface HudDisplayData {
    key: string;
    value: any;
    lang?: string;
    speak?: boolean;
}

export interface CursorPositioner {
    setCursor(data: CursorData): void;
    setCursorState(data: CursorStateData): void;
    setHudDisplay(data: HudDisplayData): Promise<void>;
    detectChanges(): void;
}

export interface CursorPointerGUI {
    style: {
        top: string,
        left: string,
    },
    image: string,
}

export type OrthogonalXY = "X" | "Y";

export interface DragDataType {
    current: Point2D;
    start: Point2D | null;
    delta: Point2D | null;
    intentionXY: OrthogonalXY | null;
}