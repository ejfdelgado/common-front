import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  printPoint2D,
} from '@mytypes/BodyTypes';

export class HandsZoomRotationController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  rotation: number | null = null;
  zoom: number | null = null;
  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  displayZoomRotation() {
    this.setHudValue('top', `zoom: ${this.zoom} rot: ${this.rotation}`);
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG') {
      // Start drag
      this.leftDrag = event.data;
      this.displayZoomRotation();
    } else if (event.name == 'HAND_LEFT_DRAG') {
      // Drag
      this.leftDrag = event.data;
      this.displayZoomRotation();
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      // End drag
      this.leftDrag = null;
      this.displayZoomRotation();
    } else if (event.name == 'HAND_RIGHT_SDRAG') {
      // Start drag
      this.rightDrag = event.data;
      this.displayZoomRotation();
    } else if (event.name == 'HAND_RIGHT_DRAG') {
      // Drag
      this.rightDrag = event.data;
      this.displayZoomRotation();
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      // End drag
      this.rightDrag = null;
      this.displayZoomRotation();
    }
  }
}
