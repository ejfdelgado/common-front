import { BoneBackupType, ItemModelRef } from '@mytypes/bodyTypes';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    CCDIKSolver,
    CCDIKHelper,
} from 'three/examples/jsm/animation/CCDIKSolver.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as THREE from 'three';

export abstract class BasicAvatarScene extends THREE.Scene {

    bonesBackup: BoneBackupType[] = [];
    fbxLoader = new FBXLoader();
    gltfLoader = new GLTFLoader();
    restoreBackupOnNextComputation: boolean = false;
    ikSolver: CCDIKSolver | null = null;

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
}