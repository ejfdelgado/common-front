import { ChangeDetectorRef, ElementRef } from "@angular/core";
import {
    AVATAR_NAME,
    AVATAR_PELVIS_HEIGHT,
    BodyData,
    GenericSizeType,
} from "@mytypes/BodyTypes";
import { IndicatorService, Wait } from "@services/indicator.service";
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
import { WorldAvatar } from "@mytypes/WorldAvatar";
import { Pose } from '@mediapipe/pose';
import { convertMediaPipeToCurrent, getPeerAvatarName } from "./utils/AvatarUtilities";
import { Camera } from '@mediapipe/camera_utils';
import { GameAction, RoomGameType } from "@mytypes/ActionGameTypes";
import {
    User,
} from '@angular/fire/auth';
import { Room } from "@trystero-p2p/firebase";

export abstract class ComponentBodyTracker extends CommonSpeech {
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
    threeComponent!: ComponentWithAvatar;
    poseTracker!: Pose;
    poses: BodyData[] = [];
    currentUser: User | null = null;
    videoSize: GenericSizeType = {
        width: 0,
        height: 0,
    };
    world: WorldAvatar = {
        defaultMode: "mode",
        modes: {
            "mode": {
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

    connectedPeerIds: string[] = [];

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

    setUser(user: User | null) {
        this.currentUser = user;
    }

    async initializeBodyTracker(
        videoR: ElementRef<HTMLVideoElement>,
        canvasR: ElementRef<HTMLCanvasElement>,
        threeComponent: ComponentWithAvatar,
    ) {
        this.videoRef = videoR;
        this.canvasRef = canvasR;
        this.threeComponent = threeComponent;

        // camera stuff
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
                const response = await this.threeComponent.computeIKLevel1(
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
                if (err.message == "-1") {
                    // Means person is detected, but must fit all in the camera
                    if (this.errorState != err.message) {
                        this.errorState = err.message;
                        this.cdr.detectChanges();
                    }
                }
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

    startTracking() {
        if (!this.trackerStarted) {
            const video = this.videoRef.nativeElement;
            this.camera = new Camera(video, {
                onFrame: async () => {
                    await this.poseTracker.send({ image: video });
                },
                width: 640,
                height: 480
            });
            this.camera.start();
            this.trackerStarted = true;
        }
    }

    stopAll() {
        this.stopTracking();
        this.stopListening();
        exitFullscreen();
        ModuloSonido.play('/assets/sounds/button.mp3');
        this.started = false;
    }

    abstract getAvatarContainer(): ComponentWithAvatar;

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

    public async loadWorld(url: string, defaultMode?: string, notifyPeers?: boolean) {
        const loading = this.indicatorSrv.start();
        const promise = this.avatarSrv.loadWorld(url);
        try {
            await this.stopSafetly();
            this.world = await promise;
            await this.applyMode(defaultMode ? defaultMode : this.world.defaultMode, notifyPeers);
        } catch (err) {
            console.log(err);
        } finally {
            loading.done();
        }
    }

    public abstract broadcastBinaryData(command: GameAction): Promise<void>;

    public async applyMode(id: string, notifyPeers?: boolean) {
        const mode = this.world.modes[id];
        const avatarContainer = this.getAvatarContainer();

        if (!mode || !avatarContainer.scene) {
            return;
        }
        if (notifyPeers === true) {
            // Sends others the change intention
            const command: GameAction = {
                type: "mode",
                data: id,
            }
            this.broadcastBinaryData(command);
        }

        // Set general config
        this.mirror = mode.mirror;
        // Place the camera
        const camera = mode.defaultCameraState;
        avatarContainer.scene.forceCameraState(camera);
        // Define controllers
        const controllers = mode.controllers;
        await avatarContainer.removeAllControllers();
        for (let i = 0; i < controllers.length; i++) {
            const config = controllers[i];
            const controller = avatarContainer.createController(config);
            await avatarContainer.addController(controller);
            controller.setParams(config.params);
        }
        // Add scenario
        const scenario = mode.scenarios[mode.defaultSenario];
        if (scenario.useComposer) {
            avatarContainer.useComposer = scenario.useComposer;
        }
        await avatarContainer.scene.initializeScenario(scenario);

        // Place the avatar
        const position = mode.defaultPosition;
        // Search the correct height
        let postY = avatarContainer.scene.getFirstHitFromTopToDown(position.positionX, position.positionZ);
        if (!postY) {
            postY = 0;
        }
        position.positionY = postY + AVATAR_PELVIS_HEIGHT;
        // Restore T pose transformation
        avatarContainer.scene.restoreTBoneBackup(AVATAR_NAME);
        // Clean old transformation
        avatarContainer.scene.forceAvatarState(position, mode.mirror);

        // Remove all animations
        avatarContainer.scene.clearAnimations();
        // Remove old characters
        avatarContainer.scene.removeAllCharacters();

        // Add characters
        if (mode.characters) {
            const promises: Promise<any>[] = [];
            for (let i = 0; i < mode.characters.length; i++) {
                const spec = mode.characters[i];
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
        //console.log("All loaded");
    }
}