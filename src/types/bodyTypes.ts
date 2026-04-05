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