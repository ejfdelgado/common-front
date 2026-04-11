import { ElementRef } from "@angular/core";
import { BodyData, GenericSizeType } from "@mytypes/BodyTypes";
import { Wait } from "@services/indicator.service";
import { ModuloSonido } from "@services/sonido.service";
import { tracker } from '@tools/tracker.js';
import * as THREE from 'three';
import { ThreejsComponent } from "app/pages/threejstest/threejs/threejs.component";
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { CommonSpeech } from "app/pages/commonSpeech";
import * as tf from '@tensorflow/tfjs';

export abstract class BodyTrackerComponent extends CommonSpeech {

    started: boolean = false;
    activity: Wait | null = null;
    videoRef!: ElementRef<HTMLVideoElement>;
    poses: BodyData[] = [];
    videoSize: GenericSizeType = {
        width: 0,
        height: 0,
    };
    trackerSubscription: Function | null = null;

    async initializeBodyTracker(
        videoR: ElementRef<HTMLVideoElement>,
        threeComponent: ThreejsComponent,
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
        tracker.setModel('BlazePoseLite');
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
            this.poses = poses;
            if (this.activity) {
                this.activity.done();
                this.activity = null;
            }
            this.updateVideoSize();
            if (this.poses.length > 0) {
                // Level 1
                try {
                    await threeComponent.computeIKLevel1(this.poses, this.videoSize);
                } catch (err: any) {
                    if (err.message == "-1") {
                        // Means person is detected, but must fit all in the camera

                    }
                }
            }
        }) as any;
        this.trackerSubscription = unsubscribe;
    }

    async startTracking() {
        this.started = true;
        ModuloSonido.play('/assets/sounds/button.mp3');
        tracker.run('camera');
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

    async stopTracking() {
        if (this.trackerSubscription) {
            this.trackerSubscription();
            this.trackerSubscription = null;
        }
        tracker.pause();
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
}