import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  printPoint2D,
} from '@mytypes/BodyTypes';

export class HandsNavigationController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  logDragValues: boolean = false;
  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  displayLeftDelta() {
    if (this.logDragValues) {
      this.setHudValue('left', this.leftDrag?.delta ? printPoint2D(this.leftDrag.delta) : '');
    }
  }

  displayRightDelta() {
    if (this.logDragValues) {
      this.setHudValue('right', this.rightDrag?.delta ? printPoint2D(this.rightDrag.delta) : '');
    }
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG') {
      // Start drag
      this.leftDrag = event.data;
      this.displayLeftDelta();
    } else if (event.name == 'HAND_LEFT_DRAG') {
      // Drag
      this.leftDrag = event.data;
      this.displayLeftDelta();
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      // End drag
      this.leftDrag = null;
      this.displayLeftDelta();
    } else if (event.name == 'HAND_RIGHT_SDRAG') {
      // Start drag
      this.rightDrag = event.data;
      this.displayRightDelta();
    } else if (event.name == 'HAND_RIGHT_DRAG') {
      // Drag
      this.rightDrag = event.data;
      this.displayRightDelta();
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      // End drag
      this.rightDrag = null;
      this.displayRightDelta();
    } else if (event.name == 'HANDS_ZOOM_ROTATION_START') {
      // 
    } else if (event.name == 'HANDS_ZOOM_ROTATION') {
      // 
    } else if (event.name == 'HANDS_ZOOM_ROTATION_END') {
      // 
    }
  }
}
