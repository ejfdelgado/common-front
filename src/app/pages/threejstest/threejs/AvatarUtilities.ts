import { BodyData, BodyKeyPointData, FrontComputationType } from "@mytypes/bodyTypes";
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const textureLoader = new TextureLoader();

export function computeAvatarFront(keypoints3DMap: { [key: string]: BodyKeyPointData }): FrontComputationType {
    const left_shoulder = keypoints3DMap['left_shoulder'];
    const right_shoulder = keypoints3DMap['right_shoulder'];
    const left_hip = keypoints3DMap['left_hip'];
    const right_hip = keypoints3DMap['right_hip'];

    const v1 = new THREE.Vector3(left_hip.x - right_hip.x, left_hip.y - right_hip.y, left_hip.z - right_hip.z);
    const v2 = new THREE.Vector3(right_shoulder.x - right_hip.x, right_shoulder.y - right_hip.y, right_shoulder.z - right_hip.z);
    const front1 = new THREE.Vector3().crossVectors(v1, v2).normalize();

    const v1p = new THREE.Vector3(right_shoulder.x - left_shoulder.x, right_shoulder.y - left_shoulder.y, right_shoulder.z - left_shoulder.z);
    const v2p = new THREE.Vector3(left_hip.x - left_shoulder.x, left_hip.y - left_shoulder.y, left_hip.z - left_shoulder.z);
    const front2 = new THREE.Vector3().crossVectors(v1p, v2p).normalize();

    const FRONT_REFERENCE = new THREE.Vector3(-1, 0, 0);
    const front = new THREE.Vector3(0, 0, 0);
    front.setX((front1.x + front2.x) / 2);
    front.setY(0);
    front.setZ((front1.z + front2.z) / 2);
    front.normalize();

    const angle = FRONT_REFERENCE.angleTo(front);

    const response: FrontComputationType = {
        x: front.x,
        y: front.y,
        angle: (front.z < 0 ? -1 : 1) * angle,
        angle_deg: 0,
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

    scoreComputation += Math.max(keypoints3DMap["right_shoulder"].score, keypoints3DMap["left_shoulder"].score);
    countScores++;
    scoreComputation += Math.max(keypoints3DMap["right_ear"].score, keypoints3DMap["left_ear"].score);
    countScores++;
    scoreComputation += Math.max(keypoints3DMap["right_heel"].score, keypoints3DMap["left_heel"].score);
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
    //newTexture.colorSpace = THREE.SRGBColorSpace;
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