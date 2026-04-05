import { BodyData, BodyKeyPointData, BoneBackupType, ItemModelRef } from '@mytypes/bodyTypes';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    CCDIKSolver,
    CCDIKHelper,
} from 'three/examples/jsm/animation/CCDIKSolver.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as THREE from 'three';
import { computeAvatarFront, getAvatarSkinnedMesh, getHigherAvatarScoredPose, replaceAvatarSkin } from './AvatarUtilities';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export abstract class BasicAvatarScene extends THREE.Scene {

    bonesBackup: BoneBackupType[] = [];
    fbxLoader = new FBXLoader();
    gltfLoader = new GLTFLoader();
    restoreBackupOnNextComputation: boolean = false;
    ikSolver: CCDIKSolver | null = null;
    BONE_MAP_ORIGINAL_ROTATION: Map<string, THREE.Euler> = new Map();
    computingIK: boolean = false;
    originalPelvisRotation: THREE.Euler | null = null;

    makeBoneBackup(model: THREE.Object3D<THREE.Object3DEventMap>) {
        this.bonesBackup = [];
        const makeBackupBone = (boneName: string) => {
            const bone = model.getObjectByName(boneName);
            if (bone) {
                this.bonesBackup.push({
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

    restoreBoneBackup() {
        const model = this.getObjectByName("avatar");
        if (model) {
            this.bonesBackup.forEach((bk) => {
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

    async addModel(
        item: ItemModelRef, autoAdd: boolean = true
    ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
        return new Promise((resolve, reject) => {
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
                            object.name = item.name;
                            if (object != null) {
                                if (autoAdd) {
                                    //inspectAvatarObject(object);
                                    this.add(object);
                                }
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
                } else {
                    alert(`No loader for ${item.url}`);
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

        const iteration = 10;

        const ikModel: any[] = [
            {
                target: bonesIdMap['target_chest'],
                effector: bonesIdMap['head'],
                links: [
                    { index: bonesIdMap['trunk'], },
                    //{ index: bonesIdMap['pelvis'], },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_head'],
                effector: bonesIdMap['head2'],
                links: [
                    { index: bonesIdMap['head'], },
                    { index: bonesIdMap['trunk'], },
                    //{index: bonesIdMap['pelvis'],},
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_kneeR'],
                effector: bonesIdMap['footR'],
                links: [
                    {
                        index: bonesIdMap['legR'],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_footR'],
                effector: bonesIdMap['foot2R'],
                links: [
                    {
                        index: bonesIdMap['footR'],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-90 - 45)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0)
                    },
                    {
                        index: bonesIdMap['legR'],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_kneeL'],
                effector: bonesIdMap['footL'],
                links: [
                    {
                        index: bonesIdMap['legL'],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_footL'],
                effector: bonesIdMap['foot2L'],
                links: [
                    {
                        index: bonesIdMap['footL'],
                        rotationMin: new THREE.Vector3(
                            0, 0, 0),
                        rotationMax: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(90 + 45))
                    },
                    {
                        index: bonesIdMap['legL'],
                    },
                ],
                iteration: iteration,
            },
            //
            {
                target: bonesIdMap['target_elbowR'],
                effector: bonesIdMap['armR'],
                links: [
                    {
                        index: bonesIdMap['elbowR'],
                        rotationMin: new THREE.Vector3(
                            -Math.PI, -Math.PI, -Math.PI),
                        rotationMax: new THREE.Vector3(
                            Math.PI, Math.PI, Math.PI),
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_elbowL'],
                effector: bonesIdMap['armL'],
                links: [
                    {
                        index: bonesIdMap['elbowL'],
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
                target: bonesIdMap['target_armR'],
                effector: bonesIdMap['handR'],
                links: [
                    {
                        index: bonesIdMap['armR'],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_armL'],
                effector: bonesIdMap['handL'],
                links: [
                    {
                        index: bonesIdMap['armL'],
                    },
                ],
                iteration: iteration,
            },
            //
            {
                target: bonesIdMap['target_handR'],
                effector: bonesIdMap['hand2R'],
                links: [
                    {
                        index: bonesIdMap['handR'],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-150)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0),
                    },
                    {
                        index: bonesIdMap['armR'],
                    },
                ],
                iteration: iteration,
            },
            {
                target: bonesIdMap['target_handL'],
                effector: bonesIdMap['hand2L'],
                links: [
                    {
                        index: bonesIdMap['handL'],
                        rotationMin: new THREE.Vector3(
                            0, 0, THREE.MathUtils.degToRad(-150)),
                        rotationMax: new THREE.Vector3(
                            0, 0, 0),
                    },
                    {
                        index: bonesIdMap['armL'],
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

    async computeIK(poses: BodyData[]) {
        if (this.computingIK || poses.length == 0) {
            return;
        }
        this.computingIK = true;
        try {
            if (this.restoreBackupOnNextComputation) {
                this.restoreBoneBackup();
                this.restoreBackupOnNextComputation = false;
            }
            const model = this.getObjectByName("avatar");
            const { pose, score } = getHigherAvatarScoredPose(poses);
            if (score < 90) {
                // Not all body in view
                this.computingIK = false;
                this.restoreBackupOnNextComputation = true;
                return;
            }
            if (!model || !pose) {
                this.computingIK = false;
                return;
            }

            const keypoints3DMap: { [key: string]: BodyKeyPointData } = {};
            pose.keypoints3D.forEach((sourceData) => {
                const sourceCoord = new THREE.Vector3(sourceData.x, sourceData.y, sourceData.z);
                sourceCoord.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
                sourceCoord.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(14));
                sourceData.x = sourceCoord.x;
                sourceData.y = sourceCoord.y;
                sourceData.z = sourceCoord.z;
            });
            // Generate map
            pose.keypoints3D.forEach((el) => {
                keypoints3DMap[el.name] = el;
            });

            const computeAverage = (name: string, list: BodyKeyPointData[]) => {
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
            }

            // Generate front vector
            const pelvisBone = model.getObjectByName("pelvis");
            if (pelvisBone) {
                const frontData = computeAvatarFront(keypoints3DMap);
                if (this.originalPelvisRotation == null) {
                    this.originalPelvisRotation = pelvisBone.rotation.clone();
                }
                const delta = -1 * (frontData.angle + Math.PI / 2);
                pelvisBone.rotation.y = this.originalPelvisRotation.y + delta;
            }

            // avg(left_shoulder, right_shoulder) => target_chest
            pose.keypoints3D.push(computeAverage("target_chest", [
                keypoints3DMap["right_shoulder"],
                keypoints3DMap["left_shoulder"],
            ]));
            // avg(left_ear, right_ear) => target_head
            pose.keypoints3D.push(computeAverage("target_head", [
                keypoints3DMap["right_ear"],
                keypoints3DMap["left_ear"],
            ]));

            pose.keypoints3D.forEach((el) => {
                keypoints3DMap[el.name] = el;
            });

            const MAPPING_TARGETS = [
                { "source": "left_knee", "target": "target_kneeL" },
                { "source": "left_heel", "target": "target_footL" },
                { "source": "right_knee", "target": "target_kneeR" },
                { "source": "right_heel", "target": "target_footR" },
                //
                { "source": "right_shoulder", "target": "target_elbowR" },
                { "source": "right_elbow", "target": "target_armR" },
                { "source": "right_wrist", "target": "target_handR" },
                { "source": "left_shoulder", "target": "target_elbowL" },
                { "source": "left_elbow", "target": "target_armL" },
                { "source": "left_wrist", "target": "target_handL" },
                //
                { "source": "target_chest", "target": "target_chest" },
                { "source": "target_head", "target": "target_head" },
            ];
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
            } else {
                console.log("No ikSolver!");
            }
        } catch (err) {
            console.log(err);
        } finally {
            this.computingIK = false;
        }
    }

    setHDRSky(url: string) {
        return new Promise<void>((resolve, reject) => {
            new HDRLoader().load(url, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.environment = texture;
                this.background = texture;
                this.environmentIntensity = 0.3;
                resolve();
            }, (err) => {
                //reject(err);
            });
        });
    }

    async addAvatar(
        url: string,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        orbitals: OrbitControls
    ) {
        return new Promise<THREE.Object3D<THREE.Object3DEventMap>>((resolve, reject) => {
            this.addModel({ name: "avatar", url: url, }, true).then(async (object) => {
                if (camera && orbitals) {
                    //fitCameraToObject(this.camera, object, this.orbitals);
                }

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
}