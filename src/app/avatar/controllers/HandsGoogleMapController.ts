import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  printPoint2D,
} from '@mytypes/BodyTypes';

export class HandsGoogleMapController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  logDragValues: boolean = false;
  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG') {
      // Start drag
    } else if (event.name == 'HAND_LEFT_DRAG') {
      // Drag
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      // End drag
    } else if (event.name == 'HAND_RIGHT_SDRAG') {
      // Start drag
    } else if (event.name == 'HAND_RIGHT_DRAG') {
      // Drag
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      // End drag
    } else if (event.name == 'HANDS_ZOOM_ROTATION_START') {
      // 
    } else if (event.name == 'HANDS_ZOOM_ROTATION') {
      // 
    } else if (event.name == 'HANDS_ZOOM_ROTATION_END') {
      // 
    }
  }
}
