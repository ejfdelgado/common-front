
import { Matrix, solve } from 'ml-matrix';

export interface Point2DType {
    x: number;
    y: number;
}

export interface Point3DType {
    x: number;
    y: number;
    z: number;
}

export interface EstimateQuery {
    imageDimensions: {
        width: number;
        height: number;
    };
    focalLength: {
        x: number;
        y: number;
    };
    points2D: Point2DType[];
    points3D: Point3DType[];
}

export interface EstimateResponse {
    aux: Array<Array<number>>;
    rvec: Array<Array<number>>;
    tvec: Array<Array<number>>;
    t: Array<Array<number>>;
}

// Convert Rodrigues vector (rx, ry, rz) to 3x3 Rotation matrix
function rodriguesToMatrix(rvec: number[]): Matrix {
    const rx = rvec[0], ry = rvec[1], rz = rvec[2];
    const theta = Math.sqrt(rx * rx + ry * ry + rz * rz);
    let R = Matrix.eye(3);
    if (theta > 1e-8) {
        const ux = rx / theta;
        const uy = ry / theta;
        const uz = rz / theta;
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const C = 1 - c;

        R.set(0, 0, ux * ux * C + c);
        R.set(0, 1, ux * uy * C - uz * s);
        R.set(0, 2, ux * uz * C + uy * s);

        R.set(1, 0, uy * ux * C + uz * s);
        R.set(1, 1, uy * uy * C + c);
        R.set(1, 2, uy * uz * C - ux * s);

        R.set(2, 0, uz * ux * C - uy * s);
        R.set(2, 1, uz * uy * C + ux * s);
        R.set(2, 2, uz * uz * C + c);
    }
    return R;
}

export function solvePNP(query: EstimateQuery): EstimateResponse {
    const { imageDimensions, focalLength, points2D, points3D } = query;
    const numPoints = points2D.length;

    if (numPoints < 4) {
        throw new Error('solvePNP requires at least 4 points');
    }

    const cx = imageDimensions.width / 2;
    const cy = imageDimensions.height / 2;
    const fx = focalLength.x;
    const fy = focalLength.y;

    // Calculate projection error vector
    const getError = (params: number[]): number[] => {
        const errorVec = new Array(numPoints * 2).fill(0);
        const R = rodriguesToMatrix([params[0], params[1], params[2]]);
        const tx = params[3], ty = params[4], tz = params[5];

        for (let i = 0; i < numPoints; i++) {
            const p3 = points3D[i];
            
            // Transform point
            const Xc = R.get(0, 0) * p3.x + R.get(0, 1) * p3.y + R.get(0, 2) * p3.z + tx;
            const Yc = R.get(1, 0) * p3.x + R.get(1, 1) * p3.y + R.get(1, 2) * p3.z + ty;
            const Zc = R.get(2, 0) * p3.x + R.get(2, 1) * p3.y + R.get(2, 2) * p3.z + tz;

            // Project to image plane
            // Avoid division by zero
            const zSafe = Zc !== 0 ? Zc : 1e-6;
            const u_proj = fx * (Xc / zSafe) + cx;
            const v_proj = fy * (Yc / zSafe) + cy;

            // Difference from observed
            errorVec[i * 2] = points2D[i].x - u_proj;
            errorVec[i * 2 + 1] = points2D[i].y - v_proj;
        }
        return errorVec; // shape: [2N]
    };

    const getErrorNorm = (err: number[]): number => {
        let sum = 0;
        for (let i = 0; i < err.length; i++) {
            sum += err[i] * err[i];
        }
        return sum;
    };

    // Calculate Jacobian using finite differences
    const getJacobian = (params: number[], err0: number[]): Matrix => {
        const epsilon = 1e-6;
        const J = new Matrix(numPoints * 2, 6);
        for (let j = 0; j < 6; j++) {
            const p_eps = [...params];
            p_eps[j] += epsilon;
            const err_eps = getError(p_eps);
            for (let i = 0; i < numPoints * 2; i++) {
                J.set(i, j, (err0[i] - err_eps[i]) / epsilon);
            }
        }
        return J;
    };

    let params = [0, 0, 0, 0, 0, 1]; // rx, ry, rz, tx, ty, tz initial guess. 
    
    // Attempting to calculate a rough initial tz guess if 1 is too far off
    let meanZ = 0;
    for(let i=0; i<numPoints; i++) meanZ += points3D[i].z;
    meanZ /= numPoints;
    params[5] = Math.max(1.0, meanZ + focalLength.x); // just a rough heuristic

    let lambda = 0.001;
    const maxIter = 100;
    const tol = 1e-8;

    let err = getError(params);
    let E = getErrorNorm(err);

    for (let iter = 0; iter < maxIter; iter++) {
        const J = getJacobian(params, err);
        const Jt = J.transpose();
        const JtJ = Jt.mmul(J);
        const JtE = Jt.mmul(Matrix.columnVector(err));

        // Add lambda to diagonal of JtJ (damping matrix)
        const A = JtJ.clone();
        for (let i = 0; i < 6; i++) {
            A.set(i, i, A.get(i, i) * (1 + lambda));
            // standard LM uses A=(JtJ + lambda * diag(JtJ)) or A=(JtJ + lambda * I)
            if (A.get(i, i) === 0) {
                A.set(i, i, lambda); 
            }
        }

        let dpMat: Matrix;
        try {
            dpMat = solve(A, JtE); // solves A * dp = JtE
        } catch (e) {
            // Singular matrix or numeric issue
            break;
        }

        const dp = dpMat.to1DArray();
        let stepNorm = 0;
        for (let i=0; i<6; i++) stepNorm += dp[i]*dp[i];

        if (Math.sqrt(stepNorm) < tol) {
            break;
        }

        const p_new = [
            params[0] + dp[0],
            params[1] + dp[1],
            params[2] + dp[2],
            params[3] + dp[3],
            params[4] + dp[4],
            params[5] + dp[5]
        ];

        const err_new = getError(p_new);
        const E_new = getErrorNorm(err_new);

        if (E_new < E) {
            // Step accepted
            params = p_new;
            err = err_new;
            E = E_new;
            lambda /= 10;
        } else {
            // Step rejected, increase damping
            lambda *= 10;
        }

        if (E < tol) {
            break;
        }
    }

    // Format output exactly as expected
    const rvecArray = [[params[0]], [params[1]], [params[2]]];
    const tvecArray = [[params[3]], [params[4]], [params[5]]];
    
    // Also compute T (often 4x4 matrix or something, let's look at standard format)
    // The response expects: rvec: num[][], tvec: num[][], t: num[][], aux: num[][]
    // OpenCV's typical T is translation vector, but user interfaces t. Let's populate 't' as full 4x4 transform if they need it, or we just populate it with the translation.
    const Rmat = rodriguesToMatrix([params[0], params[1], params[2]]);
    const transformArray = [
        [Rmat.get(0,0), Rmat.get(0,1), Rmat.get(0,2), params[3]],
        [Rmat.get(1,0), Rmat.get(1,1), Rmat.get(1,2), params[4]],
        [Rmat.get(2,0), Rmat.get(2,1), Rmat.get(2,2), params[5]],
        [0, 0, 0, 1]
    ];
    
    return {
        rvec: rvecArray,
        tvec: tvecArray,
        t: transformArray,
        aux: [[]] // auxiliary data
    };
}