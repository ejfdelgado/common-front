import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import {
    AVATAR_NAME,
    AvatarBodyEvent,
    BodyData,
    BodyKeyPointData,
    GenericSizeType,
    StateBody,
} from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/SceneControllerAbstract';
import { EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { SceneWithComposer } from './SceneWithComposer';
import { ControlProxy } from './workers/ControlProxy';

export abstract class ComponentWithAvatar extends CommonComponent {

    controlProxy: ControlProxy = new ControlProxy();
    scene: SceneWithComposer | null = null;
    controllers: SceneControllerAbstract[] = [];
    isComputing: boolean = false;
    events: EventEmitter<AvatarBodyEvent> = new EventEmitter();
    restoreInterval: NodeJS.Timeout | null = null;
    stateBody: StateBody = {
        height: 1,
        isTPose: false,
        front: { x: 0, y: 0, z: 0, },
        left: { x: 0, y: 0, z: 0, },
        up: { x: 0, y: 0, z: 0, },
        comparable: {
            front: { x: 0, y: 0, z: 0, },
            left: { x: 0, y: 0, z: 0, },
            up: { x: 0, y: 0, z: 0, },
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
            this.controlProxy.setCurrentData({ poses, videoSize, mirror });
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
                } = response;
                this.stateBody.front = frontData.front;
                this.stateBody.left = frontData.left;
                this.stateBody.up = frontData.up;
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
                        stateBody: this.stateBody,
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

    startSkeletonGuardinan() {
        this.restoreInterval = setInterval(() => {
            if (!this.scene) {
                return;
            }
            this.scene.restoreBackupOnNextComputation = true;
        }, 5 * 1000);
    }

    updateHeadsUpLog() { }

    loop() {
        if (
            this.scene
            && this.scene.camera
            && this.scene.renderer
            && this.scene.orbitals
            && this.scene.composer
        ) {
            this.scene.camera.updateProjectionMatrix();
            // Need to be changed
            //this.scene.renderer.render(this.scene, this.scene.camera);
            this.scene.composer.render();
            this.scene.orbitals.update();
            this.scene.animate();
            this.updateHeadsUpLog();
            requestAnimationFrame(() => {
                this.loop();
            });
        }
    }
}