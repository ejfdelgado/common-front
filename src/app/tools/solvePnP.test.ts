import { solvePNP } from './solvePnP';

const query = {
    imageDimensions: { width: 640, height: 480 },
    focalLength: { x: 800, y: 800 },
    points2D: [
        { x: 320, y: 240 },
        { x: 420, y: 240 },
        { x: 420, y: 340 },
        { x: 320, y: 340 },
        { x: 200, y: 200 },
        { x: 500, y: 500 }
    ],
    points3D: [
        { x: 0, y: 0, z: 10 },
        { x: 1, y: 0, z: 10 },
        { x: 1, y: 1, z: 10 },
        { x: 0, y: 1, z: 10 },
        { x: -1, y: -1, z: 10 },
        { x: 2, y: 2, z: 10 }
    ]
};

// Ground truth: R = I, t = [0, 0, 0] (since points3D z=10 is already at z=10 from camera).
// wait, if T=0, z=10, then point (1,0,10) projects to:
// u = 800 * (1 / 10) + 320 = 80 + 320 = 400.
// Our points2D for (1,0,10) is (420, 240).
// Let's create proper synthetic data.

function generateSyntheticData() {
    const focal = 1000;
    const cx = 320, cy = 240;
    const t = [0.5, -0.2, 5.0]; // True translation
    // Let's keep rotation near 0 for now. true rvec = [0.1, -0.1, 0.05];
    // To simplify: true rvec = [0,0,0];
    const rvec = [0.0, 0.0, 0.0];

    // 3D points
    const p3d = [
        { x: -1, y: -1, z: 0 },
        { x: 1, y: -1, z: 0 },
        { x: 1, y: 1, z: 0 },
        { x: -1, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
    ];

    const p2d = p3d.map(p => {
        const xc = p.x + t[0];
        const yc = p.y + t[1];
        const zc = p.z + t[2];
        return {
            x: focal * (xc / zc) + cx,
            y: focal * (yc / zc) + cy
        };
    });

    return {
        imageDimensions: { width: 640, height: 480 },
        focalLength: { x: focal, y: focal },
        points3D: p3d,
        points2D: p2d
    };
}

const req = generateSyntheticData();
const res = solvePNP(req);
console.log('Result rvec:', res.rvec);
console.log('Result tvec:', res.tvec);
