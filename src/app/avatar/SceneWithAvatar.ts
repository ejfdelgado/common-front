import {
    AVATAR_NAME,
    AvatarLocationState,
    BodyData,
    BodyKeyPointData,
    BoneBackupType,
    FrontComputationType,
    GenericSizeType,
    ItemModelRef,
    ScenePoseEventType,
    StoredAvatarState,
} from '@mytypes/BodyTypes';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    CCDIKSolver,
    CCDIKHelper,
} from 'three/examples/jsm/animation/CCDIKSolver.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as THREE from 'three';
import {
    computeBodyPointAverage,
    getAvatarSkinnedMesh,
    replaceAvatarSkin,
    arrayToMatrix,
    mirrorPose,
    getHigherAvatarScoredPose,
    computeComparableBody,
    AvatarScore,
} from '@avatar/utils/AvatarUtilities';
import { AvatarBoneEnum, BodyPoseKey } from '@mytypes/BodyParts';
import { RecognizedCommand } from '@services/voicerecognition.service';
import { ControlProxy } from './workers/ControlProxy';
import { CameraState } from '@mytypes/WorldAvatar';

export const ROOT_PATH = "/assets/models/";
const USE_WORKER = false;

export abstract class SceneWithAvatar extends THREE.Scene {
    bounds: DOMRect;
    camera: THREE.PerspectiveCamera | null = null;
    renderer: THREE.WebGLRenderer | null = null;
    orbitals: OrbitControls | null = null;
    bonesBackup: { [key: string]: BoneBackupType[] } = {};
    tPoseBackup: { [key: string]: BoneBackupType[] } = {};
    fbxLoader = new FBXLoader();
    gltfLoader = new GLTFLoader();
    restoreBackupOnNextComputation: boolean = false;
    ikSolver: CCDIKSolver | null = null;
    BONE_MAP_ORIGINAL_ROTATION: Map<string, THREE.Euler> = new Map();
    computingIK: boolean = false;
    originalPelvisRotation: THREE.Euler | null = null;

    avatarState: AvatarLocationState = {
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotationY: 0,
    };
    avatarStateSmoot: AvatarLocationState = {
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotationY: 0,
    };

    constructor(
        bounds: DOMRect,
    ) {
        super();
        this.bounds = bounds;
    }

    makeBoneBackup(model: THREE.Object3D<THREE.Object3DEventMap>) {
        this.makeBoneBackupInternal(model, this.bonesBackup);
    }

    makeTPoseBoneBackup(model: THREE.Object3D<THREE.Object3DEventMap>) {
        this.makeBoneBackupInternal(model, this.tPoseBackup);
    }

    makeBoneBackupInternal(
        model: THREE.Object3D<THREE.Object3DEventMap>,
        destiny: {
            [key: string]: BoneBackupType[];
        }
    ) {
        const name = model.name;
        destiny[name] = [];
        const makeBackupBone = (boneName: string) => {
            const bone = model.getObjectByName(boneName);
            if (bone) {
                destiny[name].push({
                    boneName,
                    position: bone.position.clone(),
                    rotation: bone.rotation.clone(),
                });
            }
        }
        model.traverse((child: any) => {
            if (child.isBone || child.type === 'Bone') {
                makeBackupBone(child.name);
            }
        });
    }

    restoreTBoneBackup(name: string) {
        this.restoreBoneBackupInternal(name, this.tPoseBackup);
    }

    restoreBoneBackup(name: string) {
        this.restoreBoneBackupInternal(name, this.bonesBackup);
    }

    restoreBoneBackupInternal(
        name: string,
        origin: {
            [key: string]: BoneBackupType[];
        }
    ) {
        const model = this.getObjectByName(name);
        if (model) {
            origin[name].forEach((bk) => {
                const bone = model.getObjectByName(bk.boneName);
                if (bone) {
                    bone.position.x = bk.position.x;
                    bone.position.y = bk.position.y;
                    bone.position.z = bk.position.z;
                    bone.rotation.x = bk.rotation.x;
                    bone.rotation.y = bk.rotation.y;
                    bone.rotation.z = bk.rotation.z;
                }
            });
        }
    }

    cacheModelLoader: { [key: string]: Promise<any> } = {};

    async loadWithCache(loader: any, url: string) {
        //if (url in this.cacheModelLoader) {
        if (false) {
            const temp = await this.cacheModelLoader[url];
            return temp;
        } else {
            const promise = new Promise((resolve, reject) => {
                loader.load(
                    url,
                    async (response: any) => {
                        let object = null;
                        if (loader == this.gltfLoader) {
                            //console.log(response.scene.children[0]);
                            /*
                            const group = new THREE.Object3D(); // or new THREE.Group();
                            response.scene.children.forEach((obj: any) => group.add(obj));
                            object = group;
                            */
                            object = response.scene.children[0];
                        } else {
                            object = response;
                        }
                        resolve(object);
                    },
                    (xhr: any) => {
                        //console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
                    },
                    (error: any) => {
                        reject(error);
                    }
                );
            });
            this.cacheModelLoader[url] = promise;
            return promise;
        }
    }

    async addModel(
        item: ItemModelRef, autoAdd: boolean = true
    ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
        return new Promise(async (resolve, reject) => {
            const url = item.url;
            const partes = /([^.]+)$/.exec(item.url.toLocaleLowerCase());
            // gets extension
            if (partes != null) {
                const MAPEO_LOADERS: { [key: string]: any } = {
                    fbx: this.fbxLoader,
                    glb: this.gltfLoader,
                    gltf: this.gltfLoader,
                };
                const loader: any = MAPEO_LOADERS[partes[1]];
                if (loader) {
                    const object = (await this.loadWithCache(loader, url));
                    object.name = item.name;
                    if (object != null) {
                        if (autoAdd) {
                            //inspectAvatarObject(object);
                            this.add(object);
                        }
                    }
                    resolve(object);
                } else {
                    console.error(`No loader for ${item.url}`);
                }
            }
        });
    }

    configureIK(
        model: THREE.Object3D<THREE.Object3DEventMap>,
        skinnedMesh: THREE.SkinnedMesh,
        showHelper: boolean,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        orbitals: OrbitControls
    ): void {
        // https://threejs.org/docs/#examples/en/animations/CCDIKSolver
        const bonesIdMap: { [key: string]: number } = {};
        // Map the bones
        const originalBones = skinnedMesh.skeleton.bones;
        if (originalBones) {
            for (let i = 0; i < originalBones.length; i++) {
                const oneBone = originalBones[i];
                bonesIdMap[oneBone.name] = i;
            }
        }
        //console.log(JSON.stringify(bonesIdMap, null, 4));

        const createControlFor = (boneName: string) => {
            const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const target = new THREE.Mesh(new THREE.SphereGeometry(0.05), targetMaterial);
            const boneTarget = model.getObjectByName(boneName);
            if (boneTarget) {
                target.position.copy(boneTarget.position);
                if (camera && renderer) {
                    const transformControls = new TransformControls(camera, renderer.domElement);
                    transformControls.attach(target);
                    transformControls.setMode('translate');
                    transformControls.showX = true;
                    transformControls.showY = true;
                    transformControls.showZ = true;
                    this.add(transformControls.getHelper());
                    transformControls.addEventListener('dragging-changed', (event) => {
                        if (orbitals) {
                            orbitals.enabled = !event.value;
                            if (orbitals.enabled) {
                                boneTarget.position.copy(target.position);
                                if (this.ikSolver) {
                                    this.ikSolver.update();
                                }
                            }
                        }
                    });
                }
                this.add(target);
            } else {
                console.log(`No bone target for "${boneName}"`);
            }
        };

        //createControlFor("target_kneeR");
        //createControlFor("target_footR");
        //createControlFor("target_kneeL");
        //createControlFor("target_footL");
        //createControlFor("target_chest");
        //createControlFor("target_head");
        //createControlFor("target_elbowR");
        //createControlFor("target_elbowL");
        //createControlFor("target_armR");
        //createControlFor("target_armL");
        //createControlFor("target_handR");
        //createControlFor("target_handL");

        this.makeBoneBackup(model);
        this.makeTPoseBoneBackup(model);

        const iteration = 10;

        const ikModel: any[] = [
            {
                target: bonesIdMap[AvatarBoneEnum.target_chest],
                effector: bonesIdMap[AvatarBoneEnum.head],
                links: [
                    { index: bonesIdMap[AvatarBoneEnum.trunk], },
                    //{ index: bonesIdMap[AvatarBoneEnum.pelvis], },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_head],
                effector: bonesIdMap[AvatarBoneEnum.head2],
                links: [
                    { index: bonesIdMap[AvatarBoneEnum.head], },
                    { index: bonesIdMap[AvatarBoneEnum.trunk], },
                    //{index: bonesIdMap[AvatarBoneEnum.pelvis],},
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_knee_r],
                effector: bonesIdMap[AvatarBoneEnum.knee_r],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.hip_r],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_foot_r],
                effector: bonesIdMap[AvatarBoneEnum.foot_r],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.knee_r],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-90 - 45)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0)
                    },
                    {
                        index: bonesIdMap[AvatarBoneEnum.hip_r],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_knee_l],
                effector: bonesIdMap[AvatarBoneEnum.knee_l],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.hip_l],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_foot_l],
                effector: bonesIdMap[AvatarBoneEnum.foot_l],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.knee_l],
                        rotationMin: new THREE.Vector3(
                            0, 0, 0),
                        rotationMax: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(90 + 45))
                    },
                    {
                        index: bonesIdMap[AvatarBoneEnum.hip_l],
                    },
                ],
                iteration: iteration,
            },
            //
            {
                target: bonesIdMap[AvatarBoneEnum.target_shoulder_r],
                effector: bonesIdMap[AvatarBoneEnum.shoulder_r],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.chest_r],
                        rotationMin: new THREE.Vector3(
                            -Math.PI, -Math.PI, -Math.PI),
                        rotationMax: new THREE.Vector3(
                            Math.PI, Math.PI, Math.PI),
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_shoulder_l],
                effector: bonesIdMap[AvatarBoneEnum.shoulder_l],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.chest_l],
                        rotationMin: new THREE.Vector3(
                            -Math.PI, -Math.PI, -Math.PI),
                        rotationMax: new THREE.Vector3(
                            Math.PI, Math.PI, Math.PI),
                    },
                ],
                iteration: iteration,
            },
            //
            {
                target: bonesIdMap[AvatarBoneEnum.target_elbow_r],
                effector: bonesIdMap[AvatarBoneEnum.elbow_r],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.shoulder_r],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_elbow_l],
                effector: bonesIdMap[AvatarBoneEnum.elbow_l],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.shoulder_l],
                    },
                ],
                iteration: iteration,
            },
            //
            {
                target: bonesIdMap[AvatarBoneEnum.target_hand_r],
                effector: bonesIdMap[AvatarBoneEnum.hand_r],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.elbow_r],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-150)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0),
                    },
                    {
                        index: bonesIdMap[AvatarBoneEnum.shoulder_r],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap[AvatarBoneEnum.target_hand_l],
                effector: bonesIdMap[AvatarBoneEnum.hand_l],
                links: [
                    {
                        index: bonesIdMap[AvatarBoneEnum.elbow_l],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-150)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0),
                    },
                    {
                        index: bonesIdMap[AvatarBoneEnum.shoulder_l],
                    },
                ],
                iteration: iteration,
            },
        ];

        const iks: any[] = ikModel;
        this.ikSolver = new CCDIKSolver(skinnedMesh, iks);
        if (showHelper) {
            const helper2: CCDIKHelper = this.ikSolver.createHelper();
            helper2.name = 'CCDIKHelper';
            const oldHelper2 = this.getObjectByName('CCDIKHelper');
            if (oldHelper2) {
                this.remove(oldHelper2);
            }
            this.add(helper2);
        }
    }

    setRotationBoneAnglesDegrees(
        model: THREE.Object3D<THREE.Object3DEventMap>,
        boneName: string,
        x: number,
        y: number,
        z: number,
    ) {
        const bone = model.getObjectByName(boneName);
        if (bone && ((bone as any).isBone || bone.type === 'Bone')) {
            if (!this.BONE_MAP_ORIGINAL_ROTATION.has(boneName)) {
                this.BONE_MAP_ORIGINAL_ROTATION.set(boneName, bone.rotation.clone());
            }
            const originalRotation = this.BONE_MAP_ORIGINAL_ROTATION.get(boneName);
            if (originalRotation) {
                console.log(`Original rotation for ${boneName}:`);
                console.log(THREE.MathUtils.radToDeg(originalRotation.x), THREE.MathUtils.radToDeg(originalRotation.y), THREE.MathUtils.radToDeg(originalRotation.z));
                bone.rotation.set(
                    originalRotation.x + THREE.MathUtils.degToRad(x),
                    originalRotation.y + THREE.MathUtils.degToRad(y),
                    originalRotation.z + THREE.MathUtils.degToRad(z)
                );
            }
        } else {
            console.warn(`Bone ${boneName} not found.`);
        }
    }

    async computeIKLevel2(
        poses: BodyData[],
        videoSize: GenericSizeType,
        mirror: boolean,
        workerProxy: ControlProxy,
    ): Promise<null | false | ScenePoseEventType> {
        const response = await this.computeIKInternal(
            poses,
            videoSize,
            mirror,
            workerProxy,
        );
        return response;
    }

    /**
     * @param poses 
     * @returns null - System is bussy, false - imposible to track, ok
     */
    async computeIKInternal(
        poses: BodyData[],
        videoSize: GenericSizeType,
        mirror: boolean,
        workerProxy: ControlProxy,
    ): Promise<null | false | ScenePoseEventType> {
        if (this.computingIK) {
            return null;
        }
        if (poses.length == 0) {
            return false;
        }
        this.computingIK = true;
        try {
            const model = this.getObjectByName(AVATAR_NAME);
            let pose: BodyData | null = null;
            let score: AvatarScore = {
                all: -1,
                top: -1,
            };
            if (USE_WORKER) {
                // with worker
                const higherResponse = await workerProxy.getHigherAvatarScoredPose();
                pose = higherResponse.pose;
                score = higherResponse.score;
            } else {
                // in main thread
                const higherResponse = getHigherAvatarScoredPose(poses, videoSize);
                pose = higherResponse.pose;
                score = higherResponse.score;
            }
            if (!model || !pose) {
                this.computingIK = false;
                return false;
            }
            if (score.all < 0 && score.top < 0) {
                // Person does not fit the camera
                throw new Error(`${score}`);
            }
            const SCORE_THRESHOLD = 90;
            if (score.all < SCORE_THRESHOLD && score.top < SCORE_THRESHOLD) {
                // this.restoreBoneBackup(AVATAR_NAME);
                // Not all body in view or not trusty
                this.computingIK = false;
                return false;
            } else {
                // Good score, but it was asked to restore
                // Then use from T pose...
                if (this.restoreBackupOnNextComputation) {
                    this.restoreTBoneBackup(AVATAR_NAME);
                    this.restoreBackupOnNextComputation = false;
                }
            }

            // Intercept for mirroring if necesarry
            if (mirror) {
                mirrorPose(pose);
            }

            let keypoints3DMap: {
                [key: string]: BodyKeyPointData;
            } = {};
            let frontData: FrontComputationType | null = null;

            if (USE_WORKER) {
                const comparable1 = await workerProxy.computeComparableBody(pose, mirror);
                keypoints3DMap = comparable1.keypoints3DMap;
                frontData = comparable1.frontData;
                // overwrite pose, as log it was fixed
                pose = comparable1.pose;
            } else {
                const comparable1 = computeComparableBody(pose, mirror);
                keypoints3DMap = comparable1.keypoints3DMap;
                frontData = comparable1.frontData;
            }

            const pelvisBone = model.getObjectByName(AvatarBoneEnum.pelvis);
            if (pelvisBone) {
                if (this.originalPelvisRotation == null) {
                    this.originalPelvisRotation = pelvisBone.rotation.clone();
                }
                const delta = -1 * (frontData.angle + Math.PI / 2);
                pelvisBone.rotation.y = this.originalPelvisRotation.y + delta;
            }

            // avg(left_shoulder, right_shoulder) => target_chest
            pose.keypoints3D.push(computeBodyPointAverage(BodyPoseKey.target_chest, [
                keypoints3DMap[BodyPoseKey.right_shoulder],
                keypoints3DMap[BodyPoseKey.left_shoulder],
            ]));
            // avg(left_ear, right_ear) => target_head
            pose.keypoints3D.push(computeBodyPointAverage(BodyPoseKey.target_head, [
                keypoints3DMap[BodyPoseKey.right_ear],
                keypoints3DMap[BodyPoseKey.left_ear],
            ]));

            pose.keypoints3D.forEach((el) => {
                keypoints3DMap[el.name] = el;
            });

            let MAPPING_TARGETS: {
                source: BodyPoseKey;
                target: AvatarBoneEnum;
            }[] = [];

            if (score.all >= SCORE_THRESHOLD) {
                MAPPING_TARGETS = [
                    { "source": BodyPoseKey.left_knee, "target": AvatarBoneEnum.target_knee_l },
                    { "source": BodyPoseKey.left_heel, "target": AvatarBoneEnum.target_foot_l },
                    { "source": BodyPoseKey.right_knee, "target": AvatarBoneEnum.target_knee_r },
                    { "source": BodyPoseKey.right_heel, "target": AvatarBoneEnum.target_foot_r },
                    //
                    { "source": BodyPoseKey.right_shoulder, "target": AvatarBoneEnum.target_shoulder_r },
                    { "source": BodyPoseKey.right_elbow, "target": AvatarBoneEnum.target_elbow_r },
                    { "source": BodyPoseKey.right_wrist, "target": AvatarBoneEnum.target_hand_r },
                    { "source": BodyPoseKey.left_shoulder, "target": AvatarBoneEnum.target_shoulder_l },
                    { "source": BodyPoseKey.left_elbow, "target": AvatarBoneEnum.target_elbow_l },
                    { "source": BodyPoseKey.left_wrist, "target": AvatarBoneEnum.target_hand_l },
                    //
                    { "source": BodyPoseKey.target_chest, "target": AvatarBoneEnum.target_chest },
                    { "source": BodyPoseKey.target_head, "target": AvatarBoneEnum.target_head },
                ];
            } else {
                MAPPING_TARGETS = [
                    { "source": BodyPoseKey.right_shoulder, "target": AvatarBoneEnum.target_shoulder_r },
                    { "source": BodyPoseKey.right_elbow, "target": AvatarBoneEnum.target_elbow_r },
                    { "source": BodyPoseKey.right_wrist, "target": AvatarBoneEnum.target_hand_r },
                    { "source": BodyPoseKey.left_shoulder, "target": AvatarBoneEnum.target_shoulder_l },
                    { "source": BodyPoseKey.left_elbow, "target": AvatarBoneEnum.target_elbow_l },
                    { "source": BodyPoseKey.left_wrist, "target": AvatarBoneEnum.target_hand_l },
                    //
                    { "source": BodyPoseKey.target_chest, "target": AvatarBoneEnum.target_chest },
                    { "source": BodyPoseKey.target_head, "target": AvatarBoneEnum.target_head },
                ];
            }

            for (let i = 0; i < MAPPING_TARGETS.length; i++) {
                const { source, target } = MAPPING_TARGETS[i];
                const targetBone = model.getObjectByName(target);
                const sourceData = keypoints3DMap[source];
                if (!sourceData || !targetBone) {
                    continue;
                }

                targetBone.position.x = sourceData.x;
                targetBone.position.y = sourceData.y;
                targetBone.position.z = sourceData.z;
            }
            if (this.ikSolver) {
                this.ikSolver.update();

                const skinnedMesh = getAvatarSkinnedMesh(model);
                if (skinnedMesh) {
                    skinnedMesh.updateMatrixWorld(true);
                }
                this.makeBoneBackup(model);
            } else {
                console.log("No ikSolver!");
            }

            return {
                pose,
                keypoints3DMap,
                frontData,
            };
        } catch (err) {
            try {
                this.restoreBoneBackup(AVATAR_NAME);
            } catch (err) { }
            throw err;
        } finally {
            this.computingIK = false;
        }
    }

    async addAvatar(
        url: string,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        orbitals: OrbitControls
    ) {
        return new Promise<THREE.Object3D<THREE.Object3DEventMap>>((resolve, reject) => {
            this.addModel({ name: AVATAR_NAME, url: url, }, true).then(async (object) => {

                //this.setRotationBoneAnglesDegrees(object, "footR", 0, 0, 0);
                //this.setRotationBoneAnglesDegrees(object, "legR", 0, 0, -90);
                //this.setRotationBoneAnglesDegrees(object, "handR", 0, 0, 0);//Z: -150 -> 0
                //this.setRotationBoneAnglesDegrees(object, "handL", 0, 0, -150);//Z: -150 -> 0

                const skinnedMesh = getAvatarSkinnedMesh(object);
                if (skinnedMesh && camera && renderer && orbitals) {
                    this.configureIK(object, skinnedMesh, false, camera, renderer, orbitals);
                    if (this.ikSolver) {
                        this.ikSolver.update();
                    }
                }

                /*
                //Piernas al frente y abiertas
                this.setRotationBoneAnglesDegrees(object, "legL", 0, -45, -90);
                this.setRotationBoneAnglesDegrees(object, "legR", 0, -45, 90);
                // Rodillas flexionadas
                this.setRotationBoneAnglesDegrees(object, "footL", 0, 0, 90);
                this.setRotationBoneAnglesDegrees(object, "footR", 0, 0, -90);
                // Antebrazo al frente
                this.setRotationBoneAnglesDegrees(object, "armL", 0, 0, -90);
                this.setRotationBoneAnglesDegrees(object, "armR", 0, 0, -90);
                // Brasos flexionados
                this.setRotationBoneAnglesDegrees(object, "handL", 0, 0, -90);
                // Tronco
                this.setRotationBoneAnglesDegrees(object, "trunk", 45, 0, 0);
                //Cabeza
                this.setRotationBoneAnglesDegrees(object, "head", 0, 0, 45);
                // Pelvis
                // Esto posiciona el cuerpo y lo rota?
                this.setRotationBoneAnglesDegrees(object, "pelvis", 0, -45, 0);
                */
                //setRotationBoneLocation(object, "pelvis", 0, 0, 0);
                resolve(object);
            });
        });
    }

    replaceAvatarSkin(url: string) {
        const avatar = this.getObjectByName(AVATAR_NAME);
        if (!avatar) {
            return;
        }
        replaceAvatarSkin(avatar, url);
    }

    executeCommand(command: RecognizedCommand) {
        console.log(command);
    }

    applyAvatarState(
        avatar: THREE.Object3D<THREE.Object3DEventMap>,
        state: StoredAvatarState,
        lr?: number[],
    ) {
        for (let i = 0; i < state.bones.length; i++) {
            const { n, v } = state.bones[i];
            const boneTarget = avatar.getObjectByName(n);
            if (boneTarget) {
                boneTarget.position.set(v[0], v[1], v[2]);
                boneTarget.rotation.set(v[3], v[4], v[5]);
            }
        }

        let positionX = state.lr[0];
        let positionZ = state.lr[1];
        let rotationY = state.lr[2];

        if (lr && lr.length == 3) {
            positionX = lr[0];
            positionZ = lr[1];
            rotationY = lr[2];
        }
        this.applyLR(
            avatar,
            positionX,
            positionZ,
            rotationY,
            state,
        );
    }

    applyLR(
        avatar: THREE.Object3D<THREE.Object3DEventMap>,
        positionX: number,
        positionZ: number,
        rotationY: number,
        state?: StoredAvatarState,
        positionY2?: number,
    ) {
        avatar.matrixAutoUpdate = false;
        const result = new THREE.Matrix4().identity();
        const matrixTransforms: THREE.Matrix4[] = [];
        const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationY);

        const positionY = this.getFirstHitFromTopToDown(positionX, positionZ);

        const translationMatrix = new THREE.Matrix4().makeTranslation(
            positionX,
            (positionY === null ? 0 : positionY) + (positionY2 ? positionY2 : 0),
            positionZ,
        );

        // Location
        matrixTransforms.push(translationMatrix);
        // Rotation
        matrixTransforms.push(rotationMatrix);
        // Local displacement
        if (state) {
            const matrix = arrayToMatrix(state.matrix);
            matrixTransforms.push(matrix);
        }

        for (const m of matrixTransforms) {
            result.multiply(m);
        }
        avatar.matrix.copy(result);
    }

    getFirstHitFromTopToDown(x: number, z: number): number | null {
        return 0;
    }

    addCubeControll() {
        return new Promise((resolve, reject) => {
            this.addModel({ name: "", url: ROOT_PATH + "cube001.glb" }, false).then((obj) => {
                const addCube = (name: string, imageUrl: string) => {
                    const aCube = obj.clone(true);
                    aCube.name = name;
                    aCube.traverse((child: any) => {
                        if (child.isMesh && child.material) {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                            child.material.opacity = 0;//0 invisible, 1 visible
                            child.material.side = THREE.FrontSide;
                        }
                    });
                    replaceAvatarSkin(aCube, ROOT_PATH + imageUrl, 0);
                    this.add(aCube);
                };
                addCube("cube_a", "a_cube.jpg");
                addCube("cube_b", "b_cube.jpg");
                addCube("cube_c", "c_cube.jpg");
                addCube("cube_d", "d_cube.jpg");

                resolve(obj);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    async initializeControlls() {
        const cube = await this.addCubeControll();
    }

    forceAvatarState(state: AvatarLocationState, mirror: boolean) {
        const avatar = this.getObjectByName(AVATAR_NAME);
        if (!avatar) {
            return;
        }
        avatar.matrixAutoUpdate = false;
        const translationMatrix = new THREE.Matrix4().makeTranslation(
            state.positionX,
            state.positionY,
            state.positionZ,
        );
        const rotationMatrix = new THREE.Matrix4().makeRotationY(
            state.rotationY + (mirror ? Math.PI : 0),
        );
        const result = new THREE.Matrix4().multiplyMatrices(
            translationMatrix,
            rotationMatrix,
        );
        avatar.matrix.copy(result);
        Object.assign(this.avatarState, state);
        Object.assign(this.avatarStateSmoot, state);
    }

    forceCameraState(state: CameraState) {
        const camera = this.camera;
        const orbitals = this.orbitals;
        if (!camera || !orbitals) {
            return;
        }
        const cameraPosition = new THREE.Vector3(
            state.position.x,
            state.position.y,
            state.position.z,
        );
        const cameraLookAt = new THREE.Vector3(
            state.lookAt.x,
            state.lookAt.y,
            state.lookAt.z,
        );
        orbitals.enabled = false;
        camera.position.copy(cameraPosition);

        // In degrees
        camera.fov = state.fov;

        camera.lookAt(cameraLookAt);
        orbitals.target.set(cameraLookAt.x, cameraLookAt.y, cameraLookAt.z);
        orbitals.enabled = true;
    }
}