import { AvatarBodyEvent, ControllerUpdateResponse } from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import { ModuloSonido } from 'src/app/services/sonido.service';
import { GameScenario } from 'src/types/WorldAvatar';

export class AmbienceMusicController extends SceneControllerAbstract {
  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }

  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  override setScenario(scenario: GameScenario) {
    super.setScenario(scenario);
    this.preloadAudios();
  }

  override async onEvent(event: AvatarBodyEvent): Promise<void> {
    if (event.name == 'START_ALL') {
      const promise = await this.playAudio('intro');
      await promise.promise;
      this.playAudio('loop');
    } else if (event.name == 'STOP_ALL') {
      ModuloSonido.stopAll();
    }
  }
}
