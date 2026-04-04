
export interface Point2DType {
    x: number;
    y: number;
};

export interface Point3DType {
    x: number;
    y: number;
    z: number;
};

export interface EstimateQuery {
    imageDimensions: {
        width: number;
        height: number;
    },
    focalLength: {
        x: number;
        y: number;
    },
    points2D: Point2DType[];
    points3D: Point3DType[];
};

export interface EstimateResponse {
    aux: Array<Array<number>>;
    rvec: Array<Array<number>>;
    tvec: Array<Array<number>>;
    t: Array<Array<number>>;
}

export function solvePNP(query: EstimateQuery): EstimateResponse {
    throw new Error("Not implemented");
}