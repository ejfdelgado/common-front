import { AnimationSpecType, AvatarLocationState, Point3D } from "./BodyTypes";
import { AssistantDataType } from "./ragTypes";

// The intentatio is to persist this data
export interface WorldAvatar {
    defaultMode: string;
    config: WorldConfig,
    modes: { [key: string]: GameMode };
}

export interface WorldConfig {
    useLivePeer: boolean;
    useVoice: boolean;
}

export interface GameMode {
    menu: {
        name: string;
        icon: string;
    },
    mirror: boolean;
    defaultPosition: AvatarLocationState;
    defaultCameraState: CameraState;
    defaultSenario: string;
    controllers: GameController[];
    scenarios: { [key: string]: GameScenario };
    characters?: CharacterSpec[];
    useHands?: boolean;
    avatar?: AvatarModel;
}

export interface CharacterSpec {
    name: string;
    defaultAnimation?: string;
    animations: { [key: string]: AnimationSpecType },
}

export interface ColorType {
    r: number;
    g: number;
    b: number;
}

export interface GameScenario {
    useComposer?: boolean;
    background?: {
        image?: string;
        color?: ColorType;
    },
    meshes: GameMesh[];
    characters: GameCharacter[];
    stepsConfig?: StepsConfig;
    steps?: GameStep[];
}

export interface GameMesh {
    name: string;
    url: string;
}

export interface GameStep {
    label: string;
    options: GameStepOption[];
}

export interface StepsConfig {
    introTitle?: string;
    looseLabel?: string;
    winLabel?: string;
    maxQuestions?: number;
}

export interface GameStepOption {
    label: string;
    points: number;
    answer: string;
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
    SharePoseController = "SharePoseController",
    WalkController = "WalkController",
    FingerController = "FingerController",
    HandPointerController = "HandPointerController",
    ArmsPointerController = "ArmsPointerController",
    QuestionaireController = "QuestionaireController",
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

export interface AvatarModel {
    meshPath?: string;
    texturePath?: string;
}

export interface AvatarStoredDataType extends AssistantDataType {
    jsonModel?: string;
}

export interface GameSelection {
    scenario: string | null;
    mode: string | null;
}