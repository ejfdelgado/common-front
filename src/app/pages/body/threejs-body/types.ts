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