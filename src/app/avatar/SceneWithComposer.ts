import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { SceneWithAvatar } from "./SceneWithAvatar";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { CameraByPassShader } from './shaders/CameraByPass';
import {
    AnimatedElements,
    ROOT_PATH,
    StoredAvatarAnimation,
} from "@mytypes/BodyTypes";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import * as THREE from 'three';
import { firstValueFrom } from "rxjs";
import { decode } from "@msgpack/msgpack";
import { HttpClient } from "@angular/common/http";
import { GameScenario } from "@mytypes/WorldAvatar";

export abstract class SceneWithComposer extends SceneWithAvatar {

    previousTime = performance.now();
    previousLoadedMeshes: THREE.Object3D<THREE.Object3DEventMap>[] = [];
    composer: EffectComposer | null = null;
    outlinePass: OutlinePass | null = null;
    animatedElements: AnimatedElements[] = [];
    startingAnimationTime: number = Date.now();
    terrainMeshes: THREE.Mesh[] = [];

    constructor(
        bounds: DOMRect,
        public http: HttpClient,
    ) {
        super(bounds);
    }

    abstract initialize(): void;

    animate() {
        this.animationHeartBeat();
    }

    setupEffects(innerWidth: number, innerHeight: number) {
        if (!this.camera || !this.renderer) {
            return;
        }
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this, this.camera);
        this.composer.addPass(renderPass);

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(innerWidth, innerHeight),
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
    setBounds(bounds: DOMRect, devicePixelRatio: number) {
        this.bounds = bounds;
        if (this.camera == null || this.renderer == null || this.composer == null) {
            return;
        }
        const pixelRatio = devicePixelRatio;

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

            // This make it highlighted
            this.highlightOn(object);
        });
    }

    highlightOn(obj: THREE.Object3D<THREE.Object3DEventMap>) {
        if (!this.outlinePass) {
            return;
        }
        const index = this.outlinePass.selectedObjects.indexOf(obj);
        if (index < 0) {
            this.outlinePass.selectedObjects.push(obj);
        }
    }

    highlightOff(obj: THREE.Object3D<THREE.Object3DEventMap>) {
        if (!this.outlinePass) {
            return;
        }
        const index = this.outlinePass.selectedObjects.indexOf(obj);
        if (index >= 0) {
            this.outlinePass.selectedObjects.splice(index, 1);
        }
    }

    async loadAnimation(): Promise<StoredAvatarAnimation> {
        const loaded = await firstValueFrom(
            this.http.get(ROOT_PATH + "animations/animation.bin",
                { responseType: 'arraybuffer' },
            ));
        const model = decode(loaded);
        return model as StoredAvatarAnimation;
    }

    override getFirstHitFromTopToDown(x: number, z: number): number | null {
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

    autoDetectTerrainMeshes(
        scenario: THREE.Object3D<THREE.Object3DEventMap>,
    ) {
        scenario.traverse((child: any) => {
            if (child.name.toLocaleLowerCase().startsWith("terrain_")) {
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

    async initializeScenario(scene: GameScenario) {
        // Clean terrains
        this.terrainMeshes = [];
        // Clean highlighted meshes
        if (this.outlinePass) {
            this.outlinePass.selectedObjects = [];
        }
        // Clean old loaded scenario
        for (let i = 0; i < this.previousLoadedMeshes.length; i++) {
            const old = this.previousLoadedMeshes[i];
            this.remove(old);
        }
        // Load and add new
        // TODO optimize to load only the mesh close to the avatar
        for (let i = 0; i < scene.meshes.length; i++) {
            const specification = scene.meshes[i];
            const scenario = await this.addModel({
                name: specification.name,
                url: specification.url,
            });
            this.previousLoadedMeshes.push(scenario);
            this.autoDetectTerrainMeshes(scenario);
            if (this.camera) {
                this.makeObjectTransparentToCamera(scenario, this.camera, 0, 15, 30, 45);
            }
        }
        // Update background if needed
        const bgColor = scene.background?.color;
        if (bgColor) {
            this.background = new THREE.Color(bgColor.r, bgColor.g, bgColor.b);
        }
    }
}
