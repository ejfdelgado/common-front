import { ChangeDetectorRef, ElementRef } from "@angular/core";
import { BodyData, GenericSizeType } from "@mytypes/BodyTypes";
import { IndicatorService, Wait } from "@services/indicator.service";
import { ModuloSonido } from "@services/sonido.service";
import { tracker } from '@tools/tracker.js';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { CommonSpeech } from "app/pages/commonSpeech";
import * as tf from '@tensorflow/tfjs';
import { enterFullscreen, exitFullscreen } from "@tools/ScreenUtils";
import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from "@angular/platform-browser";
import { FullscreenService } from "@services/fullscreen.service";
import { ComponentWithAvatar } from "./ComponentWithAvatar";
import { AvatarService } from "@services/avatar.service";
import { WorldAvatar } from "@mytypes/WorldAvatar";

export abstract class ComponentBodyTracker extends CommonSpeech {
    mirror: boolean = false;
    errorState: string | null = null;
    initialized: boolean = false;
    started: boolean = false;
    trackerStarted: boolean = false;
    calledLastTime: boolean = false;
    activity: Wait | null = null;
    videoRef!: ElementRef<HTMLVideoElement>;
    poses: BodyData[] = [];
    videoSize: GenericSizeType = {
        width: 0,
        height: 0,
    };
    trackerSubscription: Function | null = null;
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
                controllers: []
            }
        }
    };

    constructor(
        public cdr: ChangeDetectorRef,
        public override voiceSrv: VoiceRecognitionService,
        public override speechSrv: SpeechSynthesisService,
        public override indicatorSrv: IndicatorService,
        public override booleanService: BooleanStateService,
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
        //
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

    async initializeBodyTracker(
        videoR: ElementRef<HTMLVideoElement>,
        threeComponent: ComponentWithAvatar,
    ) {
        await tf.ready();
        this.videoRef = videoR;
        /*
            MoveNetSinglePoseLightning
            MoveNetSinglePoseThunder
            MoveNetMultiPoseLightning
            PoseNetMobileNetV1
            PoseNetResNet50
            BlazePoseLite
            BlazePoseHeavy
            BlazePoseFull
            */
        if (this.isMobile()) {
            tracker.setModel('BlazePoseLite');
        } else {
            tracker.setModel('BlazePoseFull');
        }
        /*
        tracker.detectorConfig = {
            modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
            enableSmoothing: true,
            multiPoseMaxDimension: 256,
            enableTracking: true,
            trackerType: poseDetection.TrackerType.BoundingBox
        }
        tracker.minScore = 0.35;
        */
        tracker.elCanvas = '#canvas';
        tracker.elVideo = '#video';
        tracker.enable3D = false;
        // tracker.run('video') // takes video from a movie file (e.g., mp4)
        // tracker.run('stream') // takes video from an m3u8 online stream
        const { unsubscribe } = tracker.on('beforeupdate', async (poses: any) => {
            if (!this.started) {
                this.calledLastTime = true;
                return;
            }
            this.poses = poses;
            if (this.activity) {
                this.activity.done();
                this.activity = null;
            }
            this.updateVideoSize();
            if (this.poses.length > 0) {
                // Level 1
                try {
                    const response = await threeComponent.computeIKLevel1(
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
        }) as any;
        this.trackerSubscription = unsubscribe;
        this.initialized = true;
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
        // TODO, this function does not work!
        if (this.trackerSubscription) {
            this.trackerSubscription();
            this.trackerSubscription = null;
        }
        try {
            tracker.pause();
        } catch (err) {
            this.videoRef.nativeElement.pause();
        }
    }

    startTracking() {
        if (!this.trackerStarted) {
            tracker.run('camera');
            this.trackerStarted = true;
        }
    }

    stopAll() {
        //this.stopTracking();
        this.stopListening();
        exitFullscreen();
        ModuloSonido.play('/assets/sounds/button.mp3');
        this.started = false;
    }

    startAll() {
        this.errorState = "-1";
        this.activity = this.indicatorSrv.start();
        try {
            ModuloSonido.play('/assets/sounds/button.mp3');
            this.startTracking();
            if (!this.isMobile()) {
                this.startListening();
            }
            enterFullscreen();
            this.started = true;
        } catch (err) {
            console.log(err);
            if (this.activity) {
                this.activity.done();
            }
        }
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

    public async loadWorld(url: string, defaultMode?: string) {
        const loading = this.indicatorSrv.start();
        const promise = this.avatarSrv.loadWorld(url);
        try {
            await this.stopSafetly();
            this.world = await promise;
            this.applyMode(defaultMode ? defaultMode : this.world.defaultMode);
        } catch (err) {
            console.log(err);
        } finally {
            loading.done();
        }
    }

    public async applyMode(id: string) {
        const mode = this.world.modes[id];
        const avatarContainer = this.getAvatarContainer();

        if (!mode || !avatarContainer.scene) {
            return;
        }
        // Set general config
        this.mirror = mode.mirror;
        // Place the camera
        const camera = mode.defaultCameraState;
        avatarContainer.scene.forceCameraState(camera);
        // Define controllers
        const controllers = mode.controllers;
        await avatarContainer.removeAllControllers();
        const controllersPromises: any[] = [];
        for (let i = 0; i < controllers.length; i++) {
            const config = controllers[i];
            const controller = avatarContainer.createController(config);
            controllersPromises.push(avatarContainer.addController(controller));
            controller.setParams(config.params);
        }
        await Promise.all(controllersPromises);
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
        position.positionY = postY + 0.88;
        avatarContainer.scene.forceAvatarState(position, mode.mirror);

        // Add characters
    }
}