import { BodyPoseKey } from "@mytypes/BodyParts";
import { BodyData, BodyKeyPointData, FrontComputationType, Point3D } from "@mytypes/bodyTypes";
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const textureLoader = new TextureLoader();

export function isFacingFront(pose: BodyData) {
    // Check facing front? or back
    // Check shoulder X difference on 2D
    let faceFront = true;
    const leftShoulder2D = pose.keypoints.find(a => a.name == BodyPoseKey.left_shoulder);
    const rightShoulder2D = pose.keypoints.find(a => a.name == BodyPoseKey.right_shoulder);
    if (leftShoulder2D && rightShoulder2D) {
        const diff = leftShoulder2D.x - rightShoulder2D.x;
        if (diff < 0) {
            faceFront = false;
        }
    }
    return faceFront;
}

export function fixBodyPose(pose: BodyData) {
    const faceFront = isFacingFront(pose);
    pose.keypoints3D.forEach((sourceData) => {
        const sourceCoord = new THREE.Vector3(sourceData.x, sourceData.y, sourceData.z);
        sourceCoord.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
        // In order to fix a weir rotation to front
        sourceCoord.applyAxisAngle(
            new THREE.Vector3(1, 0, 0),
            THREE.MathUtils.degToRad(faceFront ? 14 : -4)
        );
        sourceData.x = sourceCoord.x;
        sourceData.y = sourceCoord.y;
        sourceData.z = sourceCoord.z;
    });
}

export function getKeypoints3DMap(pose: BodyData): { [key: string]: BodyKeyPointData } {
    fixBodyPose(pose);
    const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
    // Generate map
    pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
    });
    return keypoints3DMap;
}

export function computeComparableBody(
    pose: BodyData
) {
    const keypoints3DMap = getKeypoints3DMap(pose);
    // Generate front vector
    const frontData = computeAvatarFront(keypoints3DMap);
    // Common raw canonical coordinates
    const { front, up, left } = frontData;
    const dotProduct = (v1: Point3D, v2: Point3D) => {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
    const toCanonical = (v: Point3D): Point3D => {
        const p = {
            x: dotProduct(v, front),
            y: dotProduct(v, left),
            z: dotProduct(v, up),
        };
        const len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        return {
            x: p.x / len,
            y: p.y / len,
            z: p.z / len,
        };
    };

    const leftShoulder = keypoints3DMap[BodyPoseKey.left_shoulder];
    const leftElbow = keypoints3DMap[BodyPoseKey.left_elbow];
    const leftWrist = keypoints3DMap[BodyPoseKey.left_wrist];

    const rightShoulder = keypoints3DMap[BodyPoseKey.right_shoulder];
    const rightElbow = keypoints3DMap[BodyPoseKey.right_elbow];
    const rightWrist = keypoints3DMap[BodyPoseKey.right_wrist];

    const leftHip = keypoints3DMap[BodyPoseKey.left_hip];
    const leftKnee = keypoints3DMap[BodyPoseKey.left_knee];
    const leftHeel = keypoints3DMap[BodyPoseKey.left_heel];

    const rightHip = keypoints3DMap[BodyPoseKey.right_hip];
    const rightKnee = keypoints3DMap[BodyPoseKey.right_knee];
    const rightHeel = keypoints3DMap[BodyPoseKey.right_heel];

    const leftArm = toCanonical({
        x: leftElbow.x - leftShoulder.x,
        y: leftElbow.y - leftShoulder.y,
        z: leftElbow.z - leftShoulder.z,
    });

    return {
        keypoints3DMap,
        frontData,
        leftArm,
    };
}

export function computeAvatarFront(
    keypoints3DMap: { [key: string]: BodyKeyPointData },
): FrontComputationType {
    const left_shoulder = keypoints3DMap[BodyPoseKey.left_shoulder];
    const right_shoulder = keypoints3DMap[BodyPoseKey.right_shoulder];
    const left_hip = keypoints3DMap[BodyPoseKey.left_hip];
    const right_hip = keypoints3DMap[BodyPoseKey.right_hip];

    const v1 = new THREE.Vector3(
        left_hip.x - right_hip.x,
        left_hip.y - right_hip.y,
        left_hip.z - right_hip.z
    );
    const v2 = new THREE.Vector3(
        right_shoulder.x - right_hip.x,
        right_shoulder.y - right_hip.y,
        right_shoulder.z - right_hip.z
    );
    const front1 = new THREE.Vector3().crossVectors(v1, v2).normalize();

    const v1p = new THREE.Vector3(
        right_shoulder.x - left_shoulder.x,
        right_shoulder.y - left_shoulder.y,
        right_shoulder.z - left_shoulder.z
    );
    const v2p = new THREE.Vector3(
        left_hip.x - left_shoulder.x,
        left_hip.y - left_shoulder.y,
        left_hip.z - left_shoulder.z,
    );
    const front2 = new THREE.Vector3().crossVectors(v1p, v2p).normalize();

    const FRONT_REFERENCE = new THREE.Vector3(-1, 0, 0);

    const frontAll = new THREE.Vector3(
        (front1.x + front2.x) / 2,
        (front1.y + front2.y) / 2,
        (front1.z + front2.z) / 2
    );
    const front = new THREE.Vector3(
        frontAll.x,
        0,
        frontAll.z);
    front.normalize();
    frontAll.normalize();

    const angle = FRONT_REFERENCE.angleTo(front);

    // Compute up to compute left
    const up = new THREE.Vector3(
        (v2.x - v2p.x) / 2,
        (v2.y - v2p.y) / 2,
        (v2.z - v2p.z) / 2,
    );
    up.normalize();
    const left = new THREE.Vector3().crossVectors(up, frontAll).normalize();

    const response: FrontComputationType = {
        x: front.x,
        z: front.z,
        angle: (front.z < 0 ? -1 : 1) * angle,
        angle_deg: 0,
        front: {
            x: frontAll.x,
            y: frontAll.y,
            z: frontAll.z,
        },
        left: {
            x: left.x,
            y: left.y,
            z: left.z,
        },
        up: {
            x: up.x,
            y: up.y,
            z: up.z,
        }
    };
    response.angle_deg = response.angle * 180 / Math.PI;
    return response;
};

export function computeAvatarScore(pose: BodyData) {
    const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
    pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
    });
    let scoreComputation: number = 0;
    let countScores: number = 0;

    scoreComputation += Math.max(
        keypoints3DMap[BodyPoseKey.right_shoulder].score,
        keypoints3DMap[BodyPoseKey.left_shoulder].score
    );
    countScores++;
    scoreComputation += Math.max(
        keypoints3DMap[BodyPoseKey.right_ear].score,
        keypoints3DMap[BodyPoseKey.left_ear].score
    );
    countScores++;
    scoreComputation += Math.max(
        keypoints3DMap[BodyPoseKey.right_heel].score,
        keypoints3DMap[BodyPoseKey.left_heel].score
    );
    countScores++;
    const score = 100 * scoreComputation / countScores;
    return score;
};

export function getHigherAvatarScoredPose(poses: BodyData[]) {
    return poses.map((pose) => {
        const score = computeAvatarScore(pose);
        return {
            score,
            pose,
        };
    }).sort((a, b) => {
        return b.score - a.score;
    })[0];
}

export function replaceAvatarSkin(model: THREE.Object3D<THREE.Object3DEventMap>, url: string) {
    const newTexture = textureLoader.load(url);
    newTexture.colorSpace = THREE.SRGBColorSpace;
    newTexture.flipY = false;
    model.traverse((child: any) => {
        if (child.isMesh && child.material) {
            child.material.map = newTexture;
            child.material.metalness = 0.0;
            child.material.roughness = 0.8;
            child.material.needsUpdate = true;
            //child.material.roughnessMap = textureLoader.load('/assets/models/PBR/Fabric061_1K-JPG_Roughness.jpg');
            child.material.normalMap = textureLoader.load('/assets/models/PBR/Fabric061_1K-JPG_NormalGL.jpg');
            child.material.normalScale.set(1, 1);
        }
    });
}

export function setRotationBoneLocation(
    model: THREE.Object3D<THREE.Object3DEventMap>,
    boneName: string,
    x: number,
    y: number,
    z: number,
) {
    const bone = model.getObjectByName(boneName);
    if (bone && ((bone as any).isBone || bone.type === 'Bone')) {
        bone.position.set(x, y, z);
    }
}

export function getAvatarSkinnedMesh(model: THREE.Object3D<THREE.Object3DEventMap>) {
    const temp: THREE.Object3D = model;
    const children = temp.children;
    let skinnedMesh: THREE.SkinnedMesh | null = null;
    // Find the SkinnedMesh
    //console.log(model.type);
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type == 'SkinnedMesh') {
            skinnedMesh = child as THREE.SkinnedMesh;
        }
        //console.log(child.type);
    }
    return skinnedMesh;
}

export function inspectAvatarObject(model: THREE.Object3D<THREE.Object3DEventMap>) {
    model.traverse((child: any) => {
        if (child.isMesh) {
            console.log("Mesh material:", child.material);
        }
        if (child.isBone || child.type === 'Bone') {
            console.log("Bone found:", child.name, child);
        }
    });
};

export function fitCameraToObject(
    camera: THREE.PerspectiveCamera,
    object: THREE.Object3D<THREE.Object3DEventMap>,
    controls: OrbitControls,
    offset = 1.25) {
    // Ensure world transforms are up to date
    object.updateWorldMatrix(true, true);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Get the largest dimension
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180); // convert to radians
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= offset; // add some padding

    // Compute direction from camera to center
    const direction = new THREE.Vector3()
        .subVectors(camera.position, center)
        .normalize();

    // Reposition camera
    camera.position.copy(center.clone().addScaledVector(direction, cameraZ));
    camera.lookAt(center);

    // Update near/far planes
    const minZ = box.min.z;
    const maxZ = box.max.z;
    camera.near = Math.max(0.1, cameraZ - maxDim * 2);
    camera.far = cameraZ + maxDim * 2;
    camera.updateProjectionMatrix();

    // Optional: update OrbitControls target
    if (controls) {
        controls.target.copy(center);
        controls.update();
    }
};

export function computeBodyPointAverage(name: string, list: BodyKeyPointData[]) {
    const avg: BodyKeyPointData = {
        name, score: 0, x: 0, y: 0, z: 0
    };
    const size = list.length;
    list.forEach((el) => {
        avg.x += el.x;
        avg.y += el.y;
        avg.z += el.z;
        avg.score += el.score;
    });
    avg.x = avg.x / size;
    avg.y = avg.y / size;
    avg.z = avg.z / size;
    avg.score = avg.score / size;
    return avg;
};

export function makeSmootVector(
    actual: THREE.Vector3,
    destination: THREE.Vector3,
    lastTime: number,
    smootRatio: number,
    maxInactivityMillis: number,
) {
    const actualT = Date.now();
    if (lastTime == 0) {
        return actualT;
    }
    const diffTime = actualT - lastTime;
    if (diffTime > maxInactivityMillis) {
        return actualT;
    }

    const trayectoria = new THREE.Vector3(
        destination.x - actual.x,
        destination.y - actual.y,
        destination.z - actual.z,
    );
    const length = trayectoria.length();
    trayectoria.normalize();
    const thisStep = diffTime * smootRatio;
    const currentStep = Math.min(thisStep, length);
    if (length >= 0.0001) {
        trayectoria.multiplyScalar(currentStep);
        actual.x += trayectoria.x;
        actual.y += trayectoria.y;
        actual.z += trayectoria.z;
    } else {
        actual.x = destination.x;
        actual.y = destination.y;
        actual.z = destination.z;
    }
    return actualT;
}

export function makeSmootValue(
    actual: number,
    destination: number,
    lastTime: number,
    smootRatio: number,
    maxInactivityMillis: number,
    presition: number = 0.0001
) {
    const actualT = Date.now();
    if (lastTime == 0) {
        return {
            t: actualT,
            v: actual,
        };
    }
    const diffTime = actualT - lastTime;
    if (diffTime > maxInactivityMillis) {
        return {
            t: actualT,
            v: actual,
        };
    }

    let trayectoria = destination - actual;
    const totalDistance = Math.abs(trayectoria);
    if (trayectoria > 0) {
        trayectoria = 1;
    } else {
        trayectoria = -1;
    }
    const currentDelta = diffTime * smootRatio;
    const currentStep = Math.min(currentDelta, totalDistance);
    if (totalDistance > presition) {
        actual += trayectoria * currentStep;
    } else {
        actual = destination;
    }
    return {
        t: actualT,
        v: actual,
    };
}

/**
 * Converts a THREE.Matrix4 into a standard array of 16 numbers.
 */
export function matrixToArray(matrix: THREE.Matrix4): number[] {
    // .elements is a Float32Array(16)
    // We use the spread operator or Array.from to convert to a standard number[]
    return Array.from(matrix.elements);
}

/**
 * Creates a THREE.Matrix4 from an array of 16 numbers.
 */
export function arrayToMatrix(array: number[]): THREE.Matrix4 {
    if (array.length !== 16) {
        throw new Error("A Matrix4 requires exactly 16 elements.");
    }

    const matrix = new THREE.Matrix4();
    // .fromArray handles the internal mapping automatically
    matrix.fromArray(array);

    return matrix;
}