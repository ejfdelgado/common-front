import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { SceneWithAvatar } from "./SceneWithAvatar";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { CameraByPassShader } from './shaders/CameraByPass';
import {
    AnimatedElements,
    ROOT_PATH,
    StoredAvatarAnimation,
    StoredAvatarState,
} from "@mytypes/BodyTypes";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import * as THREE from 'three';
import { arrayToMatrix } from "./AvatarUtilities";
import { firstValueFrom } from "rxjs";
import { decode } from "@msgpack/msgpack";
import { HttpClient } from "@angular/common/http";

export abstract class SceneWithComposer extends SceneWithAvatar {

    previousTime = performance.now();
    composer: EffectComposer | null = null;
    outlinePass: OutlinePass | null = null;
    animatedElements: AnimatedElements[] = [];
    startingAnimationTime: number = Date.now();
    terrainMeshes: THREE.Mesh[] = [];
    bounds: DOMRect;

    constructor(
        bounds: DOMRect,
        public http: HttpClient,
    ) {
        super();
        this.bounds = bounds;
    }

    abstract initialize(): void;

    animate() {
        this.animationHeartBeat();
    }

    setupEffects() {
        if (!this.camera || !this.renderer) {
            return;
        }
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this, this.camera);
        this.composer.addPass(renderPass);

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this,
            this.camera
        );
        this.configureHalo(this.outlinePass);
        this.composer.addPass(this.outlinePass);
        const smaaPass = new SMAAPass();
        this.composer.addPass(smaaPass);
    }

    configureHalo(outlinePass: OutlinePass) {
        outlinePass.edgeStrength = 3.0;
        outlinePass.edgeGlow = 2.0;
        outlinePass.edgeThickness = 1.0;
        outlinePass.visibleEdgeColor.set('#00ffff'); // halo color
        outlinePass.hiddenEdgeColor.set('#000000');
    }

    // the resize event is fired here
    setBounds(bounds: DOMRect) {
        this.bounds = bounds;
        if (this.camera == null || this.renderer == null || this.composer == null) {
            return;
        }
        const pixelRatio = window.devicePixelRatio;

        this.camera.aspect = this.bounds.width / this.bounds.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.bounds.width, this.bounds.height);
        this.composer.setSize(this.bounds.width, this.bounds.height);
        this.renderer.setPixelRatio(pixelRatio);
        this.composer.setPixelRatio(pixelRatio);

        if (this.outlinePass) {
            this.outlinePass.setSize(this.bounds.width, this.bounds.height);
        }
    }

    animationHeartBeat() {
        const now = Date.now();
        const sceneTime = now - this.startingAnimationTime;
        for (let i = 0; i < this.animatedElements.length; i++) {
            const { avatar, state, loop, startingTime } = this.animatedElements[i];
            const { a, lr } = state;
            // Busco el frame de acuerdo al tiempo
            for (let j = 0; j < a.length; j++) {
                const pos = a[j];
                if (startingTime + pos.t > sceneTime) {
                    state.frameId = j;
                    break;
                }
            }
            if (state.frameId != undefined && state.frameId >= 0) {
                this.applyAvatarState(avatar, a[state.frameId], lr);
            }
            if (loop) {
                if (state.frameId !== undefined) {
                    if (state.frameId >= a.length - 1) {
                        state.frameId = 0;
                        this.animatedElements[i].startingTime = sceneTime;
                    }
                }
            }
        }
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
        avatar.matrixAutoUpdate = false;
        const result = new THREE.Matrix4().identity();
        const matrixTransforms: THREE.Matrix4[] = [];

        let positionX = state.lr[0];
        let positionZ = state.lr[1];
        let rotationY = state.lr[2];

        let useFixedGlobalLocRot = false;
        if (lr && lr.length == 3) {
            positionX = lr[0];
            positionZ = lr[1];
            rotationY = lr[2];
            useFixedGlobalLocRot = true;
        }
        const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationY);

        const positionY = this.getFirstHitFromTopToDown(positionX, positionZ);

        const translationMatrix = new THREE.Matrix4().makeTranslation(
            positionX,
            positionY === null ? 0 : positionY,
            positionZ,
        );

        // Location
        matrixTransforms.push(translationMatrix);
        // Rotation
        matrixTransforms.push(rotationMatrix);
        // Local displacement
        const matrix = arrayToMatrix(state.matrix);
        matrixTransforms.push(matrix);

        for (const m of matrixTransforms) {
            result.multiply(m);
        }
        avatar.matrix.copy(result);
    }

    async loadCharacters() {
        const autoAdd: boolean = true;
        this.addModel({
            name: "friend",
            url: ROOT_PATH + "avatar005.glb",
        }, autoAdd).then(async (object) => {
            // Load animation
            const anim = await this.loadAnimation();

            //anim.lr = [2, 2, Math.PI];

            this.animatedElements.push({
                avatar: object,
                loop: true,
                startingTime: 0,
                state: anim,
            });

            if (this.outlinePass) {
                this.outlinePass.selectedObjects = [object];
            }
        });
    }

    getFirstHitFromTopToDown(x: number, z: number): number | null {
        const raycaster = new THREE.Raycaster();
        const origin = new THREE.Vector3(x, 100000, z);
        const direction = new THREE.Vector3(0, -1, 0);
        raycaster.set(origin, direction);

        let highestY: number | null = null;
        for (let i = 0; i < this.terrainMeshes.length; i++) {
            const hits = raycaster.intersectObject(this.terrainMeshes[i], false);
            for (const hit of hits) {
                if (highestY === null || hit.point.y > highestY) {
                    highestY = hit.point.y;
                }
            }
        }
        return highestY;
    }

    async loadAnimation(): Promise<StoredAvatarAnimation> {
        const loaded = await firstValueFrom(this.http.get(ROOT_PATH + "animations/animation.bin", { responseType: 'arraybuffer' }));
        const model = decode(loaded);
        return model as StoredAvatarAnimation;
    }

    autoDetectTerrainMeshes(
        scenario: THREE.Object3D<THREE.Object3DEventMap>,
    ) {
        scenario.traverse((child: any) => {
            if (child.name.startsWith("terrain_")) {
                this.terrainMeshes.push(child);
            }
        });
    }

    setHDRSky(url: string) {
        return new Promise<void>((resolve, reject) => {
            new HDRLoader().load(url, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                if (this.renderer) {
                    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    this.environment = envMap;
                    this.background = envMap;
                    this.environmentIntensity = 0.3;
                }
                resolve();
            }, (err) => {
                //reject(err);
            });
        });
    }

    makeObjectTransparentToCamera(
        scenario: THREE.Object3D<THREE.Object3DEventMap>,
        camera: THREE.PerspectiveCamera,
        d1: number,
        d2: number,
        d3: number,
        d4: number,
    ) {
        const shader = CameraByPassShader(camera, d1, d2, d3, d4);
        scenario.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                materials.forEach((material: any) => {
                    material.transparent = true;
                    material.side = THREE.FrontSide;
                    material.onBeforeCompile = shader;
                });
            }
        });
    }
}