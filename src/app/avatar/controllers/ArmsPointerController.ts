import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  CursorDataSide,
  DragDataType,
  Point2D,
  Point3D,
} from '@mytypes/BodyTypes';
import { EventEmitter } from '@angular/core';
import { ControlProxy } from '../workers/ControlProxy';
import { P2PService } from 'src/app/services/p2p.service';
import { FileService } from 'src/app/services/file.srv';

const USER_ARE_USING_HANDS_THRESHOLD = 0.6;
const INTENTION_THRESHOLD = 0.075;

export class ArmsPointerController extends SceneControllerAbstract {
  leftDrag: DragDataType = {
    current: { x: 0, y: 0 },
    start: null,
    delta: null,
    intentionXY: null,
  };

  rightDrag: DragDataType = {
    current: { x: 0, y: 0 },
    start: null,
    delta: null,
    intentionXY: null,
  };

  usingLeftHand: boolean = false;
  usingRightHand: boolean = false;
  videoRatio: number = 0;
  useMirrored: boolean = true;

  constructor(
    public override events: EventEmitter<AvatarBodyEvent>,
    public override controlProxy: ControlProxy,
    public override p2pSrv: P2PService,
    public override fileSrv: FileService,
  ) {
    super(events, controlProxy, p2pSrv, fileSrv);
  }

  getRealType(type: CursorDataSide) {
    return this.useMirrored ? (type == 'L' ? 'R' : 'L') : type;
  }

  getDragData(type: CursorDataSide) {
    if (this.useMirrored) {
      if (type == 'R') {
        return this.leftDrag;
      } else {
        return this.rightDrag;
      }
    } else {
      if (type == 'L') {
        return this.leftDrag;
      } else {
        return this.rightDrag;
      }
    }
  }

  // 180° means arms down
  // 90° means arms pointing to the front
  // Also compute ray traicing
  processHand(
    typeIn: CursorDataSide,
    point3D: Point3D,
    point3D_2: Point3D,
    dragData: DragDataType,
  ): boolean {
    const type = this.getRealType(typeIn);
    const pointer = this.computeCursor(point3D);
    const pointer2 = this.computeCursor(point3D_2);

    const normY = pointer2.y * 2 - 1;
    //this.setHudValue('top', normY.toFixed(1));
    // pointing upward = -1
    // at center = 0
    // pointing downward = 1
    if (normY > USER_ARE_USING_HANDS_THRESHOLD) {
      // Leave drag and open
      this.resetHandDrag(type);
      this.cursorDisplay?.setCursorState({ type: type, state: 'invisible' });
      return false;
    }

    dragData.current.x = pointer.x;
    dragData.current.y = pointer.y;
    if (dragData.start && dragData.delta) {
      dragData.delta.x = dragData.start.x - pointer.x;
      dragData.delta.y = dragData.start.y - pointer.y;
      if (dragData.intentionXY == null) {
        const normalizedX = Math.abs(dragData.delta.x * this.videoRatio);
        const normalizedY = Math.abs(dragData.delta.y);
        if (normalizedX > INTENTION_THRESHOLD) {
          dragData.intentionXY = 'X';
        } else if (normalizedY > INTENTION_THRESHOLD) {
          dragData.intentionXY = 'Y';
        }
      }
    }
    if (this.cursorDisplay) {
      this.cursorDisplay.setCursor({
        type: type,
        x: pointer.x,
        y: pointer.y,
      });
    }
    return true;
  }

  override async update(): Promise<ControllerUpdateResponse> {
    if (this.videoRatio == 0) {
      this.videoRatio = this.videoSize.width / this.videoSize.height;
    }
    // Check shoulder angle, or arm angle
    const comparable = this.lastData?.stateBody.comparable;
    if (!comparable) {
      return {};
    }
    const { leftHand, rightHand, leftHand2, rightHand2 } = comparable;

    let useLeft = false;
    let useRight = false;
    useLeft = this.processHand('L', leftHand, leftHand2, this.leftDrag);
    useRight = this.processHand('R', rightHand, rightHand2, this.rightDrag);

    if (useLeft) {
      if (!this.usingLeftHand) {
        this.events.emit({
          name: 'HAND_LEFT_ON',
        });
        this.usingLeftHand = true;
      }
    } else {
      if (this.usingLeftHand) {
        this.events.emit({
          name: 'HAND_LEFT_OFF',
        });
        this.usingLeftHand = false;
      }
    }

    if (useRight) {
      if (!this.usingRightHand) {
        this.events.emit({
          name: 'HAND_RIGHT_ON',
        });
        this.usingRightHand = true;
      }
    } else {
      if (this.usingRightHand) {
        this.events.emit({
          name: 'HAND_RIGHT_OFF',
        });
        this.usingRightHand = false;
      }
    }

    return {};
  }

  computeCursor(arrow: Point3D): Point2D {
    return {
      x: 1 - (1 - arrow.y) * 0.5,
      y: (1 - arrow.z) * 0.5,
    };
  }

  override async stop(): Promise<void> {}

  override async destroy(): Promise<void> {}

  resetHandDrag(type: CursorDataSide) {
    const dragData: DragDataType = this.getDragData(type);
    dragData.start = null;
    dragData.delta = null;
    dragData.intentionXY = null;
  }

  initHandDrag(type: CursorDataSide) {
    const dragData: DragDataType = this.getDragData(type);
    dragData.start = {
      x: dragData.current.x,
      y: dragData.current.y,
    };
    dragData.delta = { x: 0, y: 0 };
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'Left_HAND_CLOSE') {
      this.initHandDrag('L');
    } else if (event.name == 'Right_HAND_CLOSE') {
      this.initHandDrag('R');
    } else if (event.name == 'Left_HAND_OPEN') {
      //this.setHudValue('top', event.name);
      this.resetHandDrag('L');
    } else if (event.name == 'Right_HAND_OPEN') {
      //this.setHudValue('top', event.name);
      this.resetHandDrag('R');
    }
  }
}
