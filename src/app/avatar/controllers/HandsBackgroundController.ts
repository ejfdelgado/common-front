import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  printPoint2D,
} from '@mytypes/BodyTypes';
import { ZoomRotationData } from './HandsZoomRotationController';

export class HandsBackgroundController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  logDragValues: boolean = false;
  zoomRotation: ZoomRotationData | null = null;

  bgDx: number = 0;
  bgDy: number = 0;
  bgScale: number = 1;
  bgRotateDeg: number = 0;

  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  updateTranslationRotationScale() {
    this.setHudValue("bgDx", this.bgDx);
    this.setHudValue("bgDy", this.bgDy);
    this.setHudValue("bgScale", this.bgScale);
    this.setHudValue("bgRotateDeg", this.bgRotateDeg);
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG') {
      // Start drag
      this.leftDrag = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HAND_LEFT_DRAG') {
      // Drag
      this.leftDrag = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      // End drag
      this.leftDrag = null;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HAND_RIGHT_SDRAG') {
      // Start drag
      this.rightDrag = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HAND_RIGHT_DRAG') {
      // Drag
      this.rightDrag = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      // End drag
      this.rightDrag = null;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HANDS_ZOOM_ROTATION_START') {
      // Start zoom and rotation
      this.zoomRotation = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HANDS_ZOOM_ROTATION') {
      // zoom and rotation
      this.zoomRotation = event.data;
      this.updateTranslationRotationScale();
    } else if (event.name == 'HANDS_ZOOM_ROTATION_END') {
      // End zoom and rotation
      this.zoomRotation = event.data;
      this.updateTranslationRotationScale();
    }
  }
}
