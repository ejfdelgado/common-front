import { AvatarLocationState, Point3D } from "./BodyTypes";

// The intentatio is to persist this data
export interface WorldAvatar {
    defaultMode: string;
    modes: { [key: string]: GameMode };
}

export interface GameMode {
    mirror: boolean;
    defaultPosition: AvatarLocationState;
    defaultCameraState: CameraState;
    defaultSenario: string;
    controllers: GameController[];
    scenarios: { [key: string]: GameScenario };
}

export interface ColorType {
    r: number;
    g: number;
    b: number;
}

export interface GameScenario {
    background?: {
        color?: ColorType;
    },
    meshes: GameMesh[];
    characters: GameCharacter[];
}

export interface GameMesh {
    name: string;
    url: string;
}

export interface GameAnimation {
    name: string;
    url: string;
}

export interface CameraState {
    position: Point3D;
    lookAt: Point3D;
    fov: number;
    near: number;
    far: number;
}

export enum GameControllerEnum {
    ComparableController = "ComparableController",
    CubeController = "CubeController",
    HandsCloseController = "HandsCloseController",
    RecordPoseController = "RecordPoseController",
    SimplePosesDetection = "SimplePosesDetection",
    SoundFeedbackController = "SoundFeedbackController",
    Stand2dController = "Stand2dController",
    TerrainElevationController = "TerrainElevationController",
    WalkController = "WalkController",
}

export interface GameController {
    id: GameControllerEnum;
    params: { [key: string]: any };
}

export interface GameCharacter {
    meshes: GameMesh;
    defaultAnimation: string;
    animations: { [key: string]: GameAnimation };
}