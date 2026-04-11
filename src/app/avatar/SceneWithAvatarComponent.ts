import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import {
    AVATAR_NAME,
    AvatarBodyEvent,
    BodyData,
    BodyKeyPointData,
    ComparableBody,
    GenericSizeType,
} from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/SceneControllerAbstract';
import { EventEmitter } from '@angular/core';
import { WalkBody } from '@avatar/WalkBody';
import * as THREE from 'three';
import { SceneWithComposer } from './SceneWithComposer';

export abstract class SceneWithAvatarComponent extends CommonComponent {
    scene: SceneWithComposer | null = null;
    controllers: SceneControllerAbstract[] = [];
    isComputing: boolean = false;
    events: EventEmitter<AvatarBodyEvent> = new EventEmitter();
    walkBody: WalkBody = new WalkBody(this.events);
    comparableBody: ComparableBody = {
        front: { x: 0, y: 0, z: 0, },
        left: { x: 0, y: 0, z: 0, },
        up: { x: 0, y: 0, z: 0, },
        comparable: {
            leftArm: { x: 0, y: 0, z: 0, },
            rightArm: { x: 0, y: 0, z: 0, },
            leftLeg: { x: 0, y: 0, z: 0, },
            rightLeg: { x: 0, y: 0, z: 0, },
            handL: 0,
            handR: 0,
            footL: 0,
            footR: 0,
        }
    };

    constructor(
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
    ) {
        super(sanitizer, fullScreenSrv);
        this.events.subscribe((event) => {
            this.controllers.forEach((controller) => {
                controller.onEvent(event);
            });
        });
    }

    async computeIKLevel1(
        poses: BodyData[],
        videoSize: GenericSizeType,
        mirror: boolean,
    ) {
        if (!this.scene) {
            return null;
        }
        if (this.isComputing) {
            return null;
        }
        this.isComputing = true;
        try {
            // Level 2
            const response = await this.scene.computeIKLevel2(poses, videoSize, mirror);
            if (response == false) {
                // Fire stop all controllers
                for (let i = 0; i < this.controllers.length; i++) {
                    const controller = this.controllers[i];
                    await controller.stop();
                }
            } else if (response != null) {
                // Update all controllers
                const {
                    pose,
                    keypoints3DMap,
                    frontData,
                    comparable,
                } = response;
                this.walkBody.capture(keypoints3DMap, frontData);
                this.comparableBody.front = frontData.front;
                this.comparableBody.left = frontData.left;
                this.comparableBody.up = frontData.up;
                this.comparableBody.comparable = comparable;
                const keypoints2DMap: {
                    [key: string]: BodyKeyPointData;
                } = {};
                pose.keypoints.forEach(a => {
                    keypoints2DMap[a.name] = a;
                });
                const matrixTransforms: THREE.Matrix4[] = [];
                for (let i = 0; i < this.controllers.length; i++) {
                    const controller = this.controllers[i];
                    controller.preUpdate({
                        pose,
                        keypoints3DMap,
                        keypoints2DMap,
                        frontData,
                        comparable,
                        walkBody: this.walkBody,
                        videoSize,
                    });
                    const temp = await controller.update();
                    if (temp.avatarTransform) {
                        matrixTransforms.push(temp.avatarTransform);
                    }
                }
                // Affect the avatar
                if (matrixTransforms.length > 0) {
                    const model = this.scene.getObjectByName(AVATAR_NAME);
                    if (model) {
                        model.matrixAutoUpdate = false;
                        const result = new THREE.Matrix4().identity();
                        for (const m of matrixTransforms) {
                            result.multiply(m);
                        }
                        model.matrix.copy(result);
                    }
                }
            }
            return response;
        } catch (err) {
            throw err;
        } finally {
            this.isComputing = false;
        }
    }

    async addController(control: SceneControllerAbstract) {
        if (this.scene) {
            await control.initialize({
                scene: this.scene,
            });
            this.controllers.push(control);
        } else {
            throw new Error("Scene must exists first");
        }
    }

    async removeController(control: SceneControllerAbstract) {
        const index = this.controllers.indexOf(control);
        if (index < 0) {
            return false;
        }
        await control.stop();
        await control.destroy();
        this.controllers.splice(index, 1);
        return true;
    }
}