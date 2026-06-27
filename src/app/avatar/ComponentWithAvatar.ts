import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import {
    AVATAR_NAME,
    AvatarBodyEvent,
    BodyData,
    BodyKeyPointData,
    CursorData,
    CursorPositioner,
    CursorStateData,
    GenericSizeType,
    HudDisplayData,
    StateBody,
} from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import { ChangeDetectorRef, ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { SceneWithComposer } from './SceneWithComposer';
import { ControlProxy } from './workers/ControlProxy';
import { GameController, GameControllerEnum } from '@mytypes/WorldAvatar';
import { ComparableController } from './controllers/ComparableController';
import { HandsCloseController } from './controllers/HandsCloseController';
import { RecordPoseController } from './controllers/RecordPoseController';
import { SimplePosesDetection } from './controllers/SimplePosesDetection';
import { SoundFeedbackController } from './controllers/SoundFeedbackController';
import { Stand2dController } from './controllers/Stand2dController';
import { TerrainElevationController } from './controllers/TerrainElevationController';
import { WalkController } from './controllers/WalkController';
import { CubeController } from './controllers/CubeController';
import { PromiseEmitter } from '@tools/PromiseEmitter';
import { SharePoseController } from './controllers/SharePoseController';
import { P2PService } from '@services/p2p.service';
import { FingerController } from './controllers/FingerController';
import { HandDataSegmented, HandIdType } from 'src/types/BodyParts';
import { HandPointerController } from './controllers/HandPointerController';
import { ArmsPointerController } from './controllers/ArmsPointerController';
import { QuestionaireController } from './controllers/QuestionaireController';
import { SpeechSynthesisService } from '../services/speechsynthesis.service';
import { removeEmojis } from '../tools/StringUtils';

export abstract class ComponentWithAvatar
    extends CommonComponent
    implements CursorPositioner {
    hudData: { [key: string]: any } = {
        "top": "",
        "bottom": "",
        "left": "",
        "right": "",
        "left_bottom": "",
        "right_bottom": "",
        "score": 0,
        "life": 5,
    };
    useComposer: boolean = false;
    sceneCreated: PromiseEmitter = new PromiseEmitter();
    bounds: DOMRect | null = null;
    controlProxy: ControlProxy = new ControlProxy();
    scene: SceneWithComposer | null = null;
    controllers: SceneControllerAbstract[] = [];
    isComputing: boolean = false;
    events: EventEmitter<AvatarBodyEvent> = new EventEmitter();
    restoreInterval: NodeJS.Timeout | null = null;
    hands: Map<HandIdType, HandDataSegmented> = new Map();
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
            leftHand: { x: 0, y: 0, z: 0, },
            rightHand: { x: 0, y: 0, z: 0, },
            handL: 0, handR: 0,
            footL: 0, footR: 0,
            armL: 0, armR: 0,
        }
    };

    constructor(
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
        public cdr: ChangeDetectorRef,
        public p2pSrv: P2PService,
        public speechSrv: SpeechSynthesisService,
    ) {
        super(sanitizer, fullScreenSrv);
        this.events.subscribe((event) => {
            this.controllers.forEach((controller) => {
                controller.onEvent(event);
            });
        });
    }

    abstract setCursor(data: CursorData): void;
    abstract setCursorState(data: CursorStateData): void;

    async setHudDisplay(data: HudDisplayData): Promise<void> {
        this.hudData[data.key] = this.sanitizer.bypassSecurityTrustHtml(data.value);
        if (data.speak === true) {
            let lang = "es-ES";
            if (data.lang) {
                lang = data.lang;
            }
            let text = data.value;
            text = removeEmojis(text);
            //text = html2text(text);
            await this.speechSrv.speak(text, lang);
        }
    }

    detectChanges() {
        this.cdr.detectChanges();
    }

    public abstract getParentRef(): ElementRef;

    public onResize() {
        this.computeDimensions();
        if (this.scene != null && this.bounds != null) {
            this.scene.setBounds(this.bounds, window.devicePixelRatio);
        }
    }

    public computeDimensions() {
        if (!this.getParentRef()) {
            return;
        }
        const parentNativeElement = this.getParentRef().nativeElement;
        this.bounds = parentNativeElement.getBoundingClientRect();
    }

    async computeIKLevel1(
        poses: BodyData[],
        videoSize: GenericSizeType,
        mirror: boolean,
    ) {
        if (!this.scene || poses.length == 0) {
            return null;
        }
        if (this.isComputing) {
            return null;
        }
        this.isComputing = true;
        try {
            // Level 2
            await this.controlProxy.setCurrentData({ poses, videoSize, mirror });
            const response = await this.scene.computeIKLevel2(
                poses,
                videoSize,
                mirror,
                this.controlProxy,
            );
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
                    const hands = this.hands;
                    controller.preUpdate({
                        pose,
                        keypoints3DMap,
                        keypoints2DMap,
                        frontData,
                        stateBody: this.stateBody,
                        videoSize,
                        hands,
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
                for (let i = 0; i < this.controllers.length; i++) {
                    const controller = this.controllers[i];
                    await controller.postUpdate();
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

    async removeAllControllers() {
        while (this.controllers.length > 0) {
            const [controller] = this.controllers.splice(0, 1);
            await this.removeController(controller);
        }
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
            if (!this.useComposer) {
                this.scene.renderer.render(this.scene, this.scene.camera);
            } else {
                this.scene.composer.render();
            }
            this.scene.orbitals.update();
            this.scene.animate();
            this.updateHeadsUpLog();
            requestAnimationFrame(() => {
                this.loop();
            });
        }
    }

    public createController(config: GameController): SceneControllerAbstract {
        let temp: SceneControllerAbstract | null = null;
        if (config.id == GameControllerEnum.ComparableController) {
            temp = new ComparableController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.CubeController) {
            temp = new CubeController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.HandsCloseController) {
            temp = new HandsCloseController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.RecordPoseController) {
            temp = new RecordPoseController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.SimplePosesDetection) {
            temp = new SimplePosesDetection(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.SoundFeedbackController) {
            temp = new SoundFeedbackController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.Stand2dController) {
            temp = new Stand2dController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.TerrainElevationController) {
            temp = new TerrainElevationController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.SharePoseController) {
            temp = new SharePoseController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.WalkController) {
            temp = new WalkController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.FingerController) {
            temp = new FingerController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.HandPointerController) {
            temp = new HandPointerController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.ArmsPointerController) {
            temp = new ArmsPointerController(this.events, this.controlProxy, this.p2pSrv);
        } else if (config.id == GameControllerEnum.QuestionaireController) {
            temp = new QuestionaireController(this.events, this.controlProxy, this.p2pSrv);
        }


        if (temp == null) {
            throw new Error("Unknown controller");
        }

        temp.setCursorDisplay(this);
        return temp;

    }
}