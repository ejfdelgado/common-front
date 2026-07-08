import {
    ChangeDetectorRef,
    ElementRef,
} from "@angular/core";
import {
    AVATAR_NAME,
    AVATAR_PELVIS_HEIGHT,
    BodyData,
    GenericSizeType,
} from "@mytypes/BodyTypes";
import {
    IndicatorService,
    Wait,
} from "@services/indicator.service";
import { ModuloSonido } from "@services/sonido.service";
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { CommonSpeech } from "app/pages/commonSpeech";
import { enterFullscreen, exitFullscreen } from "@tools/ScreenUtils";
import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from "@angular/platform-browser";
import { FullscreenService } from "@services/fullscreen.service";
import { ComponentWithAvatar } from "./ComponentWithAvatar";
import { AvatarService } from "@services/avatar.service";
import {
    AvatarModel,
    AvatarStoredDataType,
    GameMode,
    GameScenario,
    GameSelection,
    WorldAvatar,
} from "@mytypes/WorldAvatar";
import { Pose } from '@mediapipe/pose';
import { Hands } from '@mediapipe/hands';
import { convertMediaPipeToCurrent } from "./utils/AvatarUtilities";

import {
    GameAction,
    RoomGameType,
} from "@mytypes/ActionGameTypes";
import {
    User,
} from '@angular/fire/auth';
import { ConfigService } from "@services/config.service";
import { Camera } from "./Camera";
import { CameraPickerDialogComponent } from "@components/fields/camera-picker/camera-picker-dialog";
import { CameraDataType } from "@mytypes/CameraTypes";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";

export abstract class ComponentBodyTracker
    extends CommonSpeech {
    room: RoomGameType | null = null;
    mirror: boolean = false;
    errorState: string | null = null;
    initialized: boolean = false;
    started: boolean = false;
    trackerStarted: boolean = false;
    calledLastTime: boolean = false;
    activity: Wait | null = null;
    camera: Camera | null = null;
    videoRef!: ElementRef<HTMLVideoElement>;
    canvasRef!: ElementRef<HTMLCanvasElement>;
    poseTracker!: Pose;
    handsTracker!: Hands;
    poses: BodyData[] = [];
    currentUser: User | null = null;
    eventSubscription: Subscription | null = null;
    videoSize: GenericSizeType = {
        width: 0,
        height: 0,
    };
    public selectedItems: GameSelection = {
        mode: null,
        scenario: null,
    };
    mode: GameMode | null = null;
    scenario: GameScenario | null = null;
    world: WorldAvatar = {
        defaultMode: "mode",
        config: {
            useLivePeer: false,
            useVoice: false,
        },
        modes: {
            "mode": {
                menu: {
                    name: "",
                    icon: "",
                },
                mirror: false,
                defaultPosition: {
                    positionX: 0,
                    positionY: 0,
                    positionZ: 0,
                    rotationY: 0,
                },
                defaultCameraState: {
                    near: 0.1,
                    far: 1000,
                    fov: 25,
                    lookAt: { x: 0, y: 0, z: 0 },
                    position: { x: 0, y: 1, z: -10 },
                },
                defaultSenario: "scenario",
                scenarios: {
                    "scenario": {
                        useComposer: true,
                        background: { color: { r: 1, g: 1, b: 1 } },
                        characters: [],
                        meshes: [],
                    }
                },
                controllers: [],
            }
        }
    };

    constructor(
        public override voiceSrv: VoiceRecognitionService,
        public override speechSrv: SpeechSynthesisService,
        public override indicatorSrv: IndicatorService,
        public override booleanService: BooleanStateService,
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
        //
        public cdr: ChangeDetectorRef,
        public avatarSrv: AvatarService,
        public configSrv: ConfigService,
        public dialog: MatDialog,
    ) {
        super(
            voiceSrv,
            speechSrv,
            indicatorSrv,
            booleanService,
            sanitizer,
            fullScreenSrv,
        );
    }

    public abstract broadcastBinaryData(command: GameAction): Promise<void>;
    abstract getAvatarContainer(): ComponentWithAvatar;

    assureSubscription() {
        if (this.eventSubscription == null) {
            this.eventSubscription = this.getAvatarContainer().events.subscribe((event) => {
                // Adjust behavior, for example of hands segmentation
                // Only when arms are rised
                if (event.name == "CUBE_A_SELECT_ON") {

                } else if (event.name == "CUBE_B_SELECT_ON") {

                }
            });
        }
    }

    unsubscribeEvents() {
        if (this.eventSubscription) {
            this.eventSubscription.unsubscribe();
            this.eventSubscription = null;
        }
    }

    setUser(user: User | null) {
        this.currentUser = user;
    }

    async initializeBodyTracker(
        videoR: ElementRef<HTMLVideoElement>,
        canvasR: ElementRef<HTMLCanvasElement>,
    ) {
        this.videoRef = videoR;
        this.canvasRef = canvasR;

        // Body tracker
        this.poseTracker = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        this.poseTracker.setOptions({
            modelComplexity: 1,        // 0 (fast) | 1 | 2 (accurate)
            smoothLandmarks: true,
            smoothWorldLandmarks: true, // valid runtime option, missing from @mediapipe/pose typings
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        } as any);
        this.poseTracker.onResults((results) => {
            const converted = convertMediaPipeToCurrent(results, this.videoSize);
            if (converted) {
                this.updatePose([converted]);
            }
        });

        // Hands tracking
        this.handsTracker = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        this.handsTracker.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        this.handsTracker.onResults((results) => {
            const {
                multiHandLandmarks,
                multiHandWorldLandmarks,
                multiHandedness,
            } = results;
            for (let i = 0; i < multiHandedness.length; i++) {
                const handScore = multiHandedness[i];
                const handId = handScore.label;
                const index = handScore.index;
                this.getAvatarContainer().hands.set(handId, {
                    score: handScore.score,
                    multiHandLandmarks: multiHandLandmarks[i],
                    multiHandWorldLandmarks: multiHandWorldLandmarks[i],
                });
            }
        });

        this.initialized = true;
    }

    async updatePose(poses: any) {
        if (!this.started) {
            this.calledLastTime = true;
            return;
        }
        this.poses = poses;
        this.updateVideoSize();
        if (this.poses.length > 0) {
            // Level 1
            try {
                const response = await this.getAvatarContainer().computeIKLevel1(
                    this.poses,
                    this.videoSize,
                    this.mirror,
                );
                if (response == false) {
                    // Means no body
                    throw new Error("-1");
                } else if (response == null) {
                    // means system is bussy or no yet ready
                } else {
                    if (this.errorState != null) {
                        this.errorState = null;
                        this.cdr.detectChanges();
                    }
                }
            } catch (err: any) {
                // Means person is detected, but must fit all in the camera
                if (this.errorState == null) {
                    this.errorState = "-1";
                    this.cdr.detectChanges();
                }
            }
        } else {
            if (this.errorState == null) {
                this.errorState = "-1";
                this.cdr.detectChanges();
            }
        }
    }

    updateVideoSize() {
        if (!this.videoRef) {
            return;
        }
        if (this.videoSize.width != 0) {
            return;
        }
        const video = this.videoRef.nativeElement;
        const width = video.videoWidth;
        const height = video.videoHeight;
        this.videoSize = {
            width,
            height,
        };
    }

    downloadTextPlain(filename = 'model.json') {
        if (!this.poses || this.poses.length == 0) {
            return;
        }
        const keypoints = this.poses[0].keypoints;
        const blob = new Blob([JSON.stringify(keypoints, null, 4)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    downloadOBJ(data: string, filename = 'model.obj') {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    async savePosititon() {
        if (!this.poses || this.poses.length == 0) {
            return;
        }
        const keypoints3D = this.poses[0].keypoints3D;
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const group = new THREE.Group();
        const SPHERE_RADIUS = 0.01;
        const SCALING = 1;
        for (let i = 0; i < keypoints3D.length; i++) {
            const keyPoint = keypoints3D[i];
            const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 8, 8);
            const sphere = new THREE.Mesh(geometry, material);

            sphere.position.set(
                SCALING * keyPoint.x,
                SCALING * keyPoint.y,
                SCALING * keyPoint.z,
            );
            sphere.name = keyPoint.name;
            group.add(sphere);
        }
        group.updateMatrixWorld(true);
        const exporter = new GLTFExporter();
        exporter.parse(group, function (result) {
            let output;
            let filename;

            if (result instanceof ArrayBuffer) {
                // Binary (.glb)
                output = result;
                filename = 'model.glb';
            } else {
                // JSON (.gltf)
                output = JSON.stringify(result, null, 2);
                filename = 'model.gltf';
            }

            const blob = new Blob([output], {
                type: result instanceof ArrayBuffer
                    ? 'application/octet-stream'
                    : 'application/json'
            });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();

            URL.revokeObjectURL(url);
        },
            function (error: any) {
                console.error('Export error:', error);
            },
            {
                binary: true,
                trs: false,
                onlyVisible: true,
                truncateDrawRange: true
            });
    }

    stopTracking() {
        if (!this.camera || !this.trackerStarted) {
            return;
        }
        this.camera.stop();
        this.camera = null;
        this.trackerStarted = false;
    }

    async startTracking() {
        if (!this.trackerStarted) {
            const videoElement = this.videoRef.nativeElement;
            const selectedCamera = this.configSrv.getCamera();
            if (!selectedCamera) {
                throw new Error("No camera selected");
            }
            this.camera = new Camera(videoElement, {
                deviceId: selectedCamera.id,
                onFrame: async () => {
                    await this.poseTracker.send({ image: videoElement });
                    // Only do this if arms are pointing to the front
                    if (this.mode?.useHands === true) {
                        await this.handsTracker.send({ image: videoElement });
                    }
                },
                width: 640,
                height: 480,
            });
            this.camera.start();
            this.trackerStarted = true;
            this.assureSubscription();
        }
    }

    async openCameraPicker() {
        const ref = this.dialog.open(CameraPickerDialogComponent, {
            data: {
                currentCamera: this.configSrv.getCamera(),
            },
            disableClose: true,
            width: '480px',
        });

        return new Promise((resolve, reject) => {
            ref.afterClosed().subscribe((result: CameraDataType | null) => {
                if (result) {
                    this.configSrv.setCamera(result);
                    resolve(result);
                } else {
                    reject();
                }
            });
        });
    }

    async checkCameraSeleceted() {
        const actual = this.configSrv.getCamera();
        if (!actual) {
            await this.openCameraPicker();
        }
    }

    async startAll() {
        this.errorState = "-1";
        await this.checkCameraSeleceted();
        ModuloSonido.play('/assets/sounds/button.mp3');
        this.startTracking();
        if (this.world.config.useVoice) {
            if (!this.isMobile()) {
                this.startListening();
            }
        }
        this.getAvatarContainer().events.emit({ name: "START_ALL" });
        enterFullscreen();
    }

    stopAll() {
        this.getAvatarContainer().events.emit({ name: "STOP_ALL" });
        this.stopTracking();
        this.unsubscribeEvents();
        this.stopListening();
        exitFullscreen();
        ModuloSonido.play('/assets/sounds/button.mp3');
    }

    public onResize() {
        this.getAvatarContainer().onResize();
    }

    public async stopSafetly() {
        if (this.started) {
            this.stopAll();
            this.calledLastTime = false;
            await new Promise<void>((resolve, reject) => {
                const interval = setInterval(() => {
                    if (this.calledLastTime === true) {
                        clearInterval(interval);
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 100);
                const timeout = setTimeout(() => {
                    reject("Timeout exceed");
                    //Reload?
                }, 2000);
            });
        }
    }

    public async loadWorld(firestoreEntity: AvatarStoredDataType, defaultMode?: string, notifyPeers?: boolean): Promise<WorldAvatar> {
        const loading = this.indicatorSrv.start();
        // Eager start loadWorld
        const promise = this.avatarSrv.loadWorld(firestoreEntity);
        try {
            await this.stopSafetly();
            // Resume loadWorld
            this.world = await promise;
            const modeId = defaultMode ? defaultMode : this.world.defaultMode;
            const scenarioId = undefined;
            // ok
            await this.applyMode(modeId, scenarioId, notifyPeers);
        } catch (err) {
            console.log(err);
        } finally {
            loading.done();
        }
        return this.world;
    }

    public async reloadModeAndScenario(notifyPeers?: boolean) {
        const { mode, scenario } = this.selectedItems;
        await this.applyMode(
            mode ? mode : this.world.defaultMode,
            scenario ? scenario : undefined,
            notifyPeers,
        );
    }

    public async applyMode(modeId: string, scenarioId?: string, notifyPeers?: boolean) {
        this.mode = this.world.modes[modeId];
        const avatarContainer = this.getAvatarContainer();

        if (!this.mode || !avatarContainer.scene) {
            return;
        }
        this.selectedItems.mode = modeId;

        // Apply the mode into the threejs scenario
        await avatarContainer.scene.applyMode(this.mode);

        // Set general config
        this.mirror = this.mode.mirror;
        // Place the camera
        const camera = this.mode.defaultCameraState;
        avatarContainer.scene.forceCameraState(camera);
        // Define controllers
        const controllers = this.mode.controllers;
        await avatarContainer.removeAllControllers();
        for (let i = 0; i < controllers.length; i++) {
            const config = controllers[i];
            const controller = avatarContainer.createController(config);
            await avatarContainer.addController(controller);
            controller.setParams(config.params);
        }
        // Add scenario
        await this.applyScenario(scenarioId ? scenarioId : this.mode.defaultSenario);
        if (notifyPeers === true) {
            // Sends others the change intention
            const command: GameAction = {
                type: "mode",
                data: {
                    modeId: modeId,
                    scenarioId: scenarioId,
                },
            }
            this.broadcastBinaryData(command);
        }

        // Place the avatar
        const position = this.mode.defaultPosition;
        // Search the correct height
        let postY = avatarContainer.scene.getFirstHitFromTopToDown(position.positionX, position.positionZ);
        if (!postY) {
            postY = 0;
        }
        position.positionY = postY + AVATAR_PELVIS_HEIGHT;
        await avatarContainer.scene.waitForAvatar();
        // Restore T pose transformation
        avatarContainer.scene.restoreTBoneBackup(AVATAR_NAME);
        // Clean old transformation
        avatarContainer.scene.forceAvatarState(position, this.mode.mirror);

        // Remove all animations
        avatarContainer.scene.clearAnimations();
        // Remove old characters
        avatarContainer.scene.removeAllCharacters();

        // Add characters
        if (this.mode.characters) {
            const promises: Promise<any>[] = [];
            for (let i = 0; i < this.mode.characters.length; i++) {
                const spec = this.mode.characters[i];
                promises.push(new Promise<void>(async (resolve, reject) => {
                    try {
                        if (!avatarContainer.scene) {
                            return;
                        }
                        //console.log(`Loading character ${spec.name}`);
                        await avatarContainer.scene.loadCharacter(spec);
                        //console.log(`Loading character ${spec.name} Ok!`);
                        if (spec.defaultAnimation) {
                            const anim = spec.animations[spec.defaultAnimation];
                            if (anim) {
                                //console.log(`Loading animation ${spec.defaultAnimation} on ${spec.name}`);
                                await avatarContainer.scene.applyAnimationToCharacter(
                                    spec.name,
                                    anim,
                                );
                                //console.log(`Loading animation ${spec.defaultAnimation} on ${spec.name} Ok!`);
                            }
                        }
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }));

            }
            await Promise.all(promises);
        }

        // Update controllers
        avatarContainer.controllers.forEach((controller) => {
            if (this.mode) {
                controller.setMode(this.mode);
            }
            if (this.scenario) {
                controller.setScenario(this.scenario);
            }
        });

        avatarContainer.events.emit({ name: "SCENE_LOADED" });
        //console.log("All loaded");
    }

    public async applyScenario(scenarioId: string) {
        this.selectedItems.scenario = null;
        const avatarContainer = this.getAvatarContainer();
        if (!this.mode || !avatarContainer) {
            return;
        }
        this.scenario = this.mode.scenarios[scenarioId];
        if (!this.scenario) {
            return;
        }
        this.selectedItems.scenario = scenarioId;
        if (this.scenario.useComposer) {
            avatarContainer.useComposer = this.scenario.useComposer;
        }
        await avatarContainer.scene?.initializeScenario(this.scenario);
    }

    async applyModeBeforeSave(data: GameMode) {
        if (!this.mode) {
            return;
        }
        // Mirror
        this.mode.mirror = data.mirror;
        // Use hands
        this.mode.useHands = data.useHands;
    }

    async applyScenarioBeforeSave(data: GameScenario) {
        if (!this.scenario) {
            return;
        }
        // Background
        this.scenario.background = data.background;
        // Steps
        this.scenario.steps = data.steps;
        this.scenario.stepsConfig = data.stepsConfig;
    }

    async applyAvatarBeforeSave(data: AvatarModel) {
        if (!this.mode) {
            return;
        }
        // Avatar
        if (!this.mode.avatar) {
            this.mode.avatar = {};
        }
        // Mesh
        this.mode.avatar.meshPath = data.meshPath;
        // Texture
        this.mode.avatar.texturePath = data.texturePath;
    }
}