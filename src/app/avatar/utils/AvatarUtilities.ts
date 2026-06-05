import {
    AvatarBoneEnum,
    BodyPoseKey,
    EXPORTED_BONES,
    MediaPipeRelation,
} from "@mytypes/BodyParts";
import {
    AvatarLocationState,
    BodyData,
    BodyKeyPointData,
    ComparableBody,
    FrontComputationType,
    GenericSizeType,
    Point3D,
    SimpleComparable,
    StoredAvatarState,
} from "@mytypes/BodyTypes";
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pose, Results } from '@mediapipe/pose';

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

export function mirrorPose(pose: BodyData) {
    const mirrorFunction = (el: BodyKeyPointData) => {
        const tokens = el.name.split("_");
        if (tokens[0] == "right") {
            tokens[0] = "left";
        } else if (tokens[0] == "left") {
            tokens[0] = "right";
        }
        el.name = tokens.join("_");
        el.z = -1 * el.z;
    };
    pose.keypoints3D.forEach(mirrorFunction);
    pose.keypoints.forEach(mirrorFunction);
}

export function fixBodyPose(
    pose: BodyData,
    mirror: boolean,
) {
    const faceFront = isFacingFront(pose);
    pose.keypoints3D.forEach((sourceData) => {
        const sourceCoord = new THREE.Vector3(sourceData.x, sourceData.y, sourceData.z);
        sourceCoord.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
        // In order to fix a weir rotation to front
        let fixAngle = 0;
        if (mirror) {
            if (faceFront) {
                fixAngle = -4;
            } else {
                fixAngle = 14;
            }
        } else {
            if (faceFront) {
                fixAngle = 14;
            } else {
                fixAngle = -4;
            }
        }
        sourceCoord.applyAxisAngle(
            new THREE.Vector3(1, 0, 0),
            THREE.MathUtils.degToRad(faceFront ? 14 : -4)
        );
        sourceData.x = sourceCoord.x;
        sourceData.y = sourceCoord.y;
        sourceData.z = sourceCoord.z;
    });
}

export function getKeypoints3DMap(
    pose: BodyData,
    mirror: boolean,
): { [key: string]: BodyKeyPointData } {
    fixBodyPose(pose, mirror);
    const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
    // Generate map
    pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
    });
    return keypoints3DMap;
}

export function getKeypoints3DMapSimple(
    pose: BodyData,
    mirror: boolean,
): { [key: string]: Point3D } {
    return getKeypoints3DMap(pose, mirror);
}

const dotProduct = (v1: Point3D, v2: Point3D) => {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}
const toCanonical = (v: Point3D, front: Point3D, left: Point3D, up: Point3D): Point3D => {
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

export function computeComparableFromModel(
    model: THREE.Object3D<THREE.Object3DEventMap>
): ComparableBody {
    // Generate front vector
    const frontData = computeAvatarFrontModel(model);
    // Common raw canonical coordinates
    const { front, up, left } = frontData;

    const leftShoulder = model.getObjectByName(AvatarBoneEnum.shoulder_l);
    const leftElbow = model.getObjectByName(AvatarBoneEnum.elbow_l);
    const leftWrist = model.getObjectByName(AvatarBoneEnum.hand_l);

    const rightShoulder = model.getObjectByName(AvatarBoneEnum.shoulder_r);
    const rightElbow = model.getObjectByName(AvatarBoneEnum.elbow_r);
    const rightWrist = model.getObjectByName(AvatarBoneEnum.hand_r);

    const leftHip = model.getObjectByName(AvatarBoneEnum.hip_l);
    const leftKnee = model.getObjectByName(AvatarBoneEnum.knee_l);
    const leftHeel = model.getObjectByName(AvatarBoneEnum.foot_l);

    const rightHip = model.getObjectByName(AvatarBoneEnum.hip_r);
    const rightKnee = model.getObjectByName(AvatarBoneEnum.knee_r);
    const rightHeel = model.getObjectByName(AvatarBoneEnum.foot_r);

    if (
        !leftShoulder
        || !leftElbow
        || !leftWrist
        || !rightShoulder
        || !rightElbow
        || !rightWrist
        || !leftHip
        || !leftKnee
        || !leftHeel
        || !rightHip
        || !rightKnee
        || !rightHeel
    ) {
        throw new Error("Not found");
    }

    const comparable = computeComparableBodyInternal(
        front,
        up,
        left,
        leftShoulder.getWorldPosition(new THREE.Vector3()),
        leftElbow.getWorldPosition(new THREE.Vector3()),
        leftWrist.getWorldPosition(new THREE.Vector3()),
        rightShoulder.getWorldPosition(new THREE.Vector3()),
        rightElbow.getWorldPosition(new THREE.Vector3()),
        rightWrist.getWorldPosition(new THREE.Vector3()),
        leftHip.getWorldPosition(new THREE.Vector3()),
        leftKnee.getWorldPosition(new THREE.Vector3()),
        leftHeel.getWorldPosition(new THREE.Vector3()),
        rightHip.getWorldPosition(new THREE.Vector3()),
        rightKnee.getWorldPosition(new THREE.Vector3()),
        rightHeel.getWorldPosition(new THREE.Vector3()),
    );

    const {
        leftArm,
        leftLeg,
        rightArm,
        rightLeg,
        handL,
        handR,
        footL,
        footR,
    } = comparable;

    return {
        leftArm, leftLeg, rightArm, rightLeg,
        front, up, left,
        handL, handR,
        footL, footR,
    };
}

export function computeComparableBody(
    pose: BodyData,
    mirror: boolean,
) {
    const keypoints3DMap = getKeypoints3DMap(pose, mirror);
    // Generate front vector
    const frontData = computeAvatarFrontFromPose(keypoints3DMap);

    return {
        keypoints3DMap,
        frontData,
        pose,
    }
}

export function computeComparableBodyInternal(
    front: Point3D,
    up: Point3D,
    left: Point3D,
    leftShoulder: Point3D,
    leftElbow: Point3D,
    leftWrist: Point3D,
    rightShoulder: Point3D,
    rightElbow: Point3D,
    rightWrist: Point3D,
    leftHip: Point3D,
    leftKnee: Point3D,
    leftHeel: Point3D,
    rightHip: Point3D,
    rightKnee: Point3D,
    rightHeel: Point3D,
): SimpleComparable {
    const leftArm = toCanonical({
        x: leftElbow.x - leftShoulder.x,
        y: leftElbow.y - leftShoulder.y,
        z: leftElbow.z - leftShoulder.z,
    }, front, left, up);
    const rightArm = toCanonical({
        x: rightElbow.x - rightShoulder.x,
        y: rightElbow.y - rightShoulder.y,
        z: rightElbow.z - rightShoulder.z,
    }, front, left, up);
    const leftLeg = toCanonical({
        x: leftKnee.x - leftHip.x,
        y: leftKnee.y - leftHip.y,
        z: leftKnee.z - leftHip.z,
    }, front, left, up);
    const rightLeg = toCanonical({
        x: rightKnee.x - rightHip.x,
        y: rightKnee.y - rightHip.y,
        z: rightKnee.z - rightHip.z,
    }, front, left, up);

    const angleDegreesBetween = (
        pA1: Point3D,
        pA2: Point3D,
        pA3: Point3D,
    ) => {
        const a = new THREE.Vector3(pA1.x - pA2.x, pA1.y - pA2.y, pA1.z - pA2.z);
        const b = new THREE.Vector3(pA2.x - pA3.x, pA2.y - pA3.y, pA2.z - pA3.z);
        const angle = a.angleTo(b);
        return angle * 180 / Math.PI;
    };

    return {
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        handL: angleDegreesBetween(leftWrist, leftElbow, leftShoulder),
        handR: angleDegreesBetween(rightWrist, rightElbow, rightShoulder),
        footL: angleDegreesBetween(leftHeel, leftKnee, leftHip),
        footR: angleDegreesBetween(rightHeel, rightKnee, rightHip),
    };
}

export function vector2Point3D(i: THREE.Vector3): Point3D {
    return {
        x: i.x,
        y: i.y,
        z: i.z,
    }
}

export function computeAvatarFrontModel(
    model: THREE.Object3D<THREE.Object3DEventMap>
): FrontComputationType {
    const left_shoulder = model.getObjectByName(AvatarBoneEnum.shoulder_l);
    const right_shoulder = model.getObjectByName(AvatarBoneEnum.shoulder_r);
    const left_hip = model.getObjectByName(AvatarBoneEnum.hip_l);
    const right_hip = model.getObjectByName(AvatarBoneEnum.hip_r);
    if (
        !left_shoulder
        || !right_shoulder
        || !left_hip
        || !right_hip
    ) {
        throw Error("cant compute");
    }
    return computeAvatarFrontInternal(
        left_shoulder.getWorldPosition(new THREE.Vector3()),
        right_shoulder.getWorldPosition(new THREE.Vector3()),
        left_hip.getWorldPosition(new THREE.Vector3()),
        right_hip.getWorldPosition(new THREE.Vector3()),
    );
}


export function computeAvatarFrontFromPose(
    keypoints3DMap: { [key: string]: BodyKeyPointData },
): FrontComputationType {
    const left_shoulder = keypoints3DMap[BodyPoseKey.left_shoulder];
    const right_shoulder = keypoints3DMap[BodyPoseKey.right_shoulder];
    const left_hip = keypoints3DMap[BodyPoseKey.left_hip];
    const right_hip = keypoints3DMap[BodyPoseKey.right_hip];
    return computeAvatarFrontInternal(
        left_shoulder,
        right_shoulder,
        left_hip,
        right_hip,
    );
}

export function computeAvatarFrontInternal(
    left_shoulder: Point3D,
    right_shoulder: Point3D,
    left_hip: Point3D,
    right_hip: Point3D
): FrontComputationType {

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

export interface PersonInCameraData {
    top: boolean;
    all: boolean;
}

export function isAllPersonInsideCamera(
    pose: BodyData,
    videoSize: GenericSizeType,
    percentageTop: number = 0.1,
    percentageBottom: number = 0,
): PersonInCameraData {

    const response: PersonInCameraData = {
        top: false,
        all: false,
    }

    const top = videoSize.height * percentageTop;
    const bottom = videoSize.height * (1 - percentageBottom);
    const width = videoSize.width;

    const relevantPointsAll = [
        //head
        BodyPoseKey.nose,
        BodyPoseKey.left_ear,
        BodyPoseKey.right_ear,
        //bottom relevant
        //talon
        BodyPoseKey.left_heel,
        BodyPoseKey.right_heel,
        //rodilla
        BodyPoseKey.left_knee,
        BodyPoseKey.right_knee,
    ];

    const relevantPointsTop = [
        //head
        BodyPoseKey.nose,
        BodyPoseKey.left_ear,
        BodyPoseKey.right_ear,
        //top relevant
        BodyPoseKey.left_shoulder,
        BodyPoseKey.right_shoulder,
        BodyPoseKey.left_elbow,
        BodyPoseKey.right_elbow,
        BodyPoseKey.left_wrist,
        BodyPoseKey.right_wrist,
        //dedo indice
        BodyPoseKey.left_index,
        BodyPoseKey.right_index,
        //dedo pulgar
        BodyPoseKey.left_thumb,
        BodyPoseKey.right_thumb,
    ];

    const coreFunction = (constraint: BodyPoseKey[]): boolean => {
        const relevantYsAll: number[] = [];
        const relevantXsAll: number[] = [];
        // Itero una vez
        pose.keypoints.forEach((p) => {
            if (constraint.indexOf(p.name as BodyPoseKey) >= 0) {
                relevantYsAll.push(p.y);
                relevantXsAll.push(p.x);
            }
        });

        const minY = Math.min(...relevantYsAll);
        const maxY = Math.max(...relevantYsAll);
        const minX = Math.min(...relevantXsAll);
        const maxX = Math.max(...relevantXsAll);

        if (
            top < minY
            && bottom > maxY
            && minX > 0
            && maxX < width
        ) {
            return true;
        }
        return false;
    }



    if (coreFunction(relevantPointsAll)) {
        response.top = true;
        response.all = true;
    } else {
        if (coreFunction(relevantPointsTop)) {
            response.top = true;
            response.all = false;
        }
    }

    return response;
}

export interface AvatarScore {
    top: number;
    all: number;
}

export function computeAvatarScore(
    pose: BodyData,
    videoSize: GenericSizeType,
): AvatarScore {
    const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
    pose.keypoints3D.forEach((el) => {
        keypoints3DMap[el.name] = el;
    });

    const isPersonInside = isAllPersonInsideCamera(pose, videoSize);
    if (isPersonInside.all) {
        // Al body inside, then compute same for all and top
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

        return {
            top: score,
            all: score,
        };
    } else if (isPersonInside.top) {
        // Al body inside, then compute same for all and top
        let scoreComputation: number = 0;
        let countScores: number = 0;

        // Head
        scoreComputation += Math.max(
            keypoints3DMap[BodyPoseKey.right_ear].score,
            keypoints3DMap[BodyPoseKey.left_ear].score
        );
        countScores++;
        // Chest
        scoreComputation += Math.max(
            keypoints3DMap[BodyPoseKey.right_shoulder].score,
            keypoints3DMap[BodyPoseKey.left_shoulder].score
        );
        countScores++;

        scoreComputation += keypoints3DMap[BodyPoseKey.left_elbow].score;
        countScores++;
        scoreComputation += keypoints3DMap[BodyPoseKey.right_elbow].score;
        countScores++;

        scoreComputation += keypoints3DMap[BodyPoseKey.left_wrist].score;
        countScores++;
        scoreComputation += keypoints3DMap[BodyPoseKey.right_wrist].score;
        countScores++;

        scoreComputation += keypoints3DMap[BodyPoseKey.left_index].score;
        countScores++;
        scoreComputation += keypoints3DMap[BodyPoseKey.right_index].score;
        countScores++;

        scoreComputation += keypoints3DMap[BodyPoseKey.left_thumb].score;
        countScores++;
        scoreComputation += keypoints3DMap[BodyPoseKey.right_thumb].score;
        countScores++;

        const score = 100 * scoreComputation / countScores;

        return {
            top: score,
            all: -1,
        };
    } else {
        return {
            top: -1,
            all: -1,
        };
    }
};

export function getHigherAvatarScoredPose(
    poses: BodyData[],
    videoSize: GenericSizeType,
) {
    const sortedPoses = poses.map((pose) => {
        const score = computeAvatarScore(pose, videoSize);
        return {
            score,
            pose,
        };
    }).sort((a, b) => {
        let allDiff = b.score.all - a.score.all;
        if (allDiff != 0) {
            return allDiff;
        } else {
            return b.score.top - a.score.top;
        }
    });
    // Returns the first pose
    return sortedPoses[0];
}

export function replaceAvatarSkin(
    model: THREE.Object3D<THREE.Object3DEventMap>,
    url: string,
    useNormalScale: number = 1,
) {
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
            if (useNormalScale !== 0) {
                child.material.normalMap = textureLoader.load('/assets/models/PBR/Fabric061_1K-JPG_NormalGL.jpg');
                child.material.normalScale.set(useNormalScale, useNormalScale);
            }
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

export function computeAverage(
    points: BodyKeyPointData[],
) {
    const nuevo: BodyKeyPointData = {
        name: "avg", score: 0, x: 0, y: 0, z: 0
    };
    points.forEach(a => {
        nuevo.x += a.x;
        nuevo.y += a.y;
        nuevo.z += a.z;
        nuevo.score += a.score;
    });
    const tam = points.length;
    nuevo.x = nuevo.x / tam;
    nuevo.y = nuevo.y / tam;
    nuevo.z = nuevo.z / tam;
    nuevo.score = nuevo.score / tam;
    return nuevo;
}

export function computeAverageByNames(
    names: string[],
    points: { [key: string]: BodyKeyPointData },
) {
    const selected = names.map((name: string) => {
        return points[name];
    });
    return computeAverage(selected);
}

export function computeDistance(a: BodyKeyPointData, b: BodyKeyPointData) {
    const distance = new THREE.Vector3(a.x, a.y, a.z).distanceTo(new THREE.Vector3(b.x, b.y, b.z));
    return distance;
}

export function computeHeight(points: { [key: string]: BodyKeyPointData }) {
    const hipCenter = computeAverageByNames([
        BodyPoseKey.left_hip,
        BodyPoseKey.right_hip,
    ], points);
    const nosePoint = points[BodyPoseKey.nose];
    const distance1 = computeDistance(nosePoint, hipCenter);
    const footCenter = computeAverageByNames([
        BodyPoseKey.left_heel,
        BodyPoseKey.right_heel,
    ], points);
    const distance2 = computeDistance(hipCenter, footCenter);
    return distance1 + distance2;
}

export function convertMediaPipeToCurrent(orig: Results, videoSize: GenericSizeType) {
    if (!orig.poseLandmarks || !orig.poseWorldLandmarks) {
        return null;
    }
    const list2d = orig.poseLandmarks;
    const list3d = orig.poseWorldLandmarks;
    const response: BodyData = {
        score: 0,
        keypoints: [],
        keypoints3D: [],
    };

    const keypoints = response.keypoints;
    const keypoints3D = response.keypoints3D;

    for (let i = 0; i < MediaPipeRelation.length; i++) {
        const name = MediaPipeRelation[i];
        // 2d
        const ref2d = list2d[i];
        const score2d = ref2d.visibility ? ref2d.visibility : 0;
        keypoints.push({
            name,
            score: score2d,
            x: ref2d.x * videoSize.width,
            y: ref2d.y * videoSize.height,
            z: ref2d.z,
        });
        //3d
        const ref3d = list3d[i];
        const score3d = ref3d.visibility ? ref3d.visibility : 0;
        keypoints3D.push({
            name,
            score: score3d,
            x: ref3d.x,
            y: ref3d.y,
            z: ref3d.z,
        });
        response.score += score3d;
    }
    response.score = response.score / 33;
    return response;
}

export function getStoredAvatarState(
    t: number,
    matrix2d: THREE.Matrix4,
    location: AvatarLocationState,
    avatar: THREE.Object3D<THREE.Object3DEventMap>,
): StoredAvatarState {
    const state: StoredAvatarState = {
        t,
        matrix: matrixToArray(matrix2d),
        lr: [
            location.positionX,
            location.positionZ,
            location.rotationY,
        ],
        //d: difference,
        bones: [],
    };
    // Only export specific bones
    for (let i = 0; i < EXPORTED_BONES.length; i++) {
        const name = EXPORTED_BONES[i];
        const child = avatar.getObjectByName(name);
        if (!child) {
            continue;
        }
        const position = child.position;
        const rotation = child.rotation;
        state.bones.push({
            n: name,
            v: [
                position.x,
                position.y,
                position.z,
                rotation.x,
                rotation.y,
                rotation.z,
            ],
        });
    }
    return state;
}

export function getPeerAvatarName(peerId: string) {
    return `usr_${peerId}`;
}

function dot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Returns the smallest angle between two vectors in radians.
 * Range: [0, Math.PI]
 */
export function angleBetween(a: Point3D, b: Point3D): number {
  const lenA = length(a);
  const lenB = length(b);

  if (lenA === 0 || lenB === 0) {
    throw new Error("Cannot compute angle with a zero-length vector");
  }

  let cosTheta = dot(a, b) / (lenA * lenB);

  // Clamp to avoid NaN due to floating point errors
  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(cosTheta);
}

/**
 * Returns the smallest angle in degrees.
 */
export function angleBetweenDegrees(a: Point3D, b: Point3D): number {
  return angleBetween(a, b) * 180 / Math.PI;
}