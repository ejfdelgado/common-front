import { CommonComponent } from '@components/common.component';
import { BasicScene } from './BasicScene';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { BodyData } from '@mytypes/bodyTypes';
import { SceneControllerAbstract } from './SceneControllerAbstract';

export abstract class SceneWithAvatarComponent extends CommonComponent {
    scene: BasicScene | null = null;
    controllers: SceneControllerAbstract[] = [];
    isComputing: boolean = false;

    constructor(
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
    ) {
        super(sanitizer, fullScreenSrv);
    }

    async computeIK(poses: BodyData[]) {
        if (!this.scene) {
            return;
        }
        if (this.isComputing) {
            return;
        }
        this.isComputing = true;
        try {
            const response = await this.scene.computeIK(poses);
            if (response == false) {
                // Fire stop all controllers
                for (let i = 0; i < this.controllers.length; i++) {
                    const controller = this.controllers[i];
                    await controller.stop();
                }
            } else if (response != null) {
                // Update all controllers
                for (let i = 0; i < this.controllers.length; i++) {
                    const controller = this.controllers[i];
                    controller.preUpdate(response);
                    await controller.update();
                }
            }
        } catch (err) {
            console.log(err);
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