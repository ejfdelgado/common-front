import { AvatarLocationState } from "./BodyTypes";

// The intentatio is to persist this data
export interface WorldAvatar {
    defaultMode: string;
    modes: { [key: string]: GameMode };
}

export interface GameMode {
    defaultPosition: AvatarLocationState;
    defaultSenario: string;
    controllers: GameController[];
    scenarios: { [key: string]: GameScenario };
}

export interface GameScenario {
    meshes: GameMesh[];
}

export interface GameMesh {
    url: string;
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