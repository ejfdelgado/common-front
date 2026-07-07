import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { SceneWithAvatar } from "./SceneWithAvatar";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { CameraByPassShader } from './shaders/CameraByPass';
import {
    AnimatedElements,
    AnimationSpecType,
    DEFAULT_AVATAR_MESH,
    ROOT_PATH,
    StoredAvatarAnimation,
} from "@mytypes/BodyTypes";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import * as THREE from 'three';
import { firstValueFrom } from "rxjs";
import { decode } from "@msgpack/msgpack";
import { HttpClient } from "@angular/common/http";
import { CharacterSpec, GameScenario } from "@mytypes/WorldAvatar";

interface TerrainTriangle {
    a: THREE.Vector3;
    b: THREE.Vector3;
    c: THREE.Vector3;
}

interface TerrainGrid {
    minX: number;
    minZ: number;
    cellSize: number;
    cols: number;
    rows: number;
    cells: Map<number, TerrainTriangle[]>;
}

export abstract class SceneWithComposer extends SceneWithAvatar {

    previousTime = performance.now();
    previousLoadedMeshes: THREE.Object3D<THREE.Object3DEventMap>[] = [];
    composer: EffectComposer | null = null;
    outlinePass: OutlinePass | null = null;
    animatedElements: AnimatedElements[] = [];
    startingAnimationTime: number = Date.now();
    terrainMeshes: THREE.Mesh[] = [];
    private terrainGrid: TerrainGrid | null = null;
    characterList: CharacterSpec[] = [];

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

    async loadCharacter(detail: CharacterSpec) {
        const autoAdd: boolean = true;
        // *** This is a character ***
        await this.addModel({
            name: detail.name,
            url: ROOT_PATH + DEFAULT_AVATAR_MESH,
        }, autoAdd);
        this.characterList.push(detail);
        // TODO, preload animations?
    }

    removeAllCharacters() {
        this.characterList.forEach((detail) => {
            const model = this.getObjectByName(detail.name);
            if (model) {
                this.remove(model);
            }
        });
    }

    clearAnimations() {
        this.animatedElements = [];
    }

    // applyAnimationToCharacter("friend", {"animations/animation.bin", true, [2, 2, Math.PI]});
    async applyAnimationToCharacter(
        characterName: string,
        spec: AnimationSpecType,
    ) {
        const avatar = this.getObjectByName(characterName);
        if (!avatar) {
            return;
        }
        const old = this.animatedElements.find(a => a.avatar == avatar);
        const anim = await this.loadAnimation(spec.animationUrl);
        if (spec.lr && spec.lr.length == 3) {
            anim.lr = spec.lr;
        }
        const now = Date.now();
        const sceneTime = now - this.startingAnimationTime;
        if (old) {
            old.startingTime = sceneTime;
            old.state = anim;
        } else {
            this.animatedElements.push({
                avatar: avatar,
                loop: spec.loop,
                startingTime: sceneTime,
                state: anim,
            });
        }
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

    async loadAnimation(url: string): Promise<StoredAvatarAnimation> {
        const loaded = await firstValueFrom(
            this.http.get(ROOT_PATH + url,
                { responseType: 'arraybuffer' },
            ));
        const model = decode(loaded);
        return model as StoredAvatarAnimation;
    }

    indexTerrain() {
        this.terrainGrid = null;
        const meshes = this.terrainMeshes;
        if (meshes.length === 0) return;

        const triangles: TerrainTriangle[] = [];
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const mesh of meshes) {
            mesh.updateWorldMatrix(true, false);
            const matrix = mesh.matrixWorld;
            const geo = mesh.geometry;
            const posAttr = geo.attributes['position'] as THREE.BufferAttribute;

            const getVertex = (i: number): THREE.Vector3 => {
                return new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(matrix);
            };

            const addTriangle = (ia: number, ib: number, ic: number) => {
                const a = getVertex(ia), b = getVertex(ib), c = getVertex(ic);
                triangles.push({ a, b, c });
                for (const v of [a, b, c]) {
                    if (v.x < minX) minX = v.x;
                    if (v.x > maxX) maxX = v.x;
                    if (v.z < minZ) minZ = v.z;
                    if (v.z > maxZ) maxZ = v.z;
                }
            };

            if (geo.index) {
                const idx = geo.index;
                for (let i = 0; i < idx.count; i += 3) {
                    addTriangle(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
                }
            } else {
                for (let i = 0; i < posAttr.count; i += 3) {
                    addTriangle(i, i + 1, i + 2);
                }
            }
        }

        if (triangles.length === 0) return;

        const extent = Math.max(maxX - minX, maxZ - minZ);
        const cellSize = Math.max(1, Math.ceil(extent / 50));
        const cols = Math.ceil((maxX - minX) / cellSize) + 1;
        const rows = Math.ceil((maxZ - minZ) / cellSize) + 1;
        const cells = new Map<number, TerrainTriangle[]>();

        for (const tri of triangles) {
            const txMin = Math.min(tri.a.x, tri.b.x, tri.c.x);
            const txMax = Math.max(tri.a.x, tri.b.x, tri.c.x);
            const tzMin = Math.min(tri.a.z, tri.b.z, tri.c.z);
            const tzMax = Math.max(tri.a.z, tri.b.z, tri.c.z);

            const colMin = Math.max(0, Math.floor((txMin - minX) / cellSize));
            const colMax = Math.min(cols - 1, Math.floor((txMax - minX) / cellSize));
            const rowMin = Math.max(0, Math.floor((tzMin - minZ) / cellSize));
            const rowMax = Math.min(rows - 1, Math.floor((tzMax - minZ) / cellSize));

            for (let r = rowMin; r <= rowMax; r++) {
                for (let c = colMin; c <= colMax; c++) {
                    const k = r * cols + c;
                    if (!cells.has(k)) cells.set(k, []);
                    cells.get(k)!.push(tri);
                }
            }
        }

        this.terrainGrid = { minX, minZ, cellSize, cols, rows, cells };
    }

    override getFirstHitFromTopToDown(x: number, z: number): number | null {
        if (!this.terrainGrid) {
            // Fallback to brute-force if index has not been built yet
            const raycaster = new THREE.Raycaster();
            raycaster.set(new THREE.Vector3(x, 100000, z), new THREE.Vector3(0, -1, 0));
            let highestY: number | null = null;
            for (const mesh of this.terrainMeshes) {
                for (const hit of raycaster.intersectObject(mesh, false)) {
                    if (highestY === null || hit.point.y > highestY) highestY = hit.point.y;
                }
            }
            return highestY;
        }

        const { minX, minZ, cellSize, cols, rows, cells } = this.terrainGrid;
        const col = Math.floor((x - minX) / cellSize);
        const row = Math.floor((z - minZ) / cellSize);

        if (col < 0 || col >= cols || row < 0 || row >= rows) return null;

        const candidates = cells.get(row * cols + col);
        if (!candidates) return null;

        const ray = new THREE.Ray(new THREE.Vector3(x, 100000, z), new THREE.Vector3(0, -1, 0));
        const target = new THREE.Vector3();
        let highestY: number | null = null;

        for (const tri of candidates) {
            if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, target) !== null) {
                if (highestY === null || target.y > highestY) highestY = target.y;
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
        this.indexTerrain();
        // Update background if needed
        const bgColor = scene.background?.color;
        if (bgColor) {
            this.background = new THREE.Color(bgColor.r, bgColor.g, bgColor.b);
        } else if (scene.background?.image) {
            if (this.renderer) {
                //this.renderer.setClearColor(0x000000, 0);
                this.renderer.setClearAlpha(0);
            }
            this.background = null;
        }
    }
}
