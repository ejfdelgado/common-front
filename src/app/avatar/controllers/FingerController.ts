import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { LandmarkList, NormalizedLandmarkList } from "@mediapipe/pose";
import { BodyPoseKey, FingerPinch, HandIdType, HandKey } from "@mytypes/BodyParts";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class FingerController extends SceneControllerAbstract {

    pinchStateMap: Map<HandIdType, Map<FingerPinch, boolean>> = new Map();
    HAND_TRESHOLD = 0.8;

    override async update(): Promise<ControllerUpdateResponse> {
        const hands = this.lastData.hands;
        hands.forEach((hand, handId) => {
            const {
                score,
                multiHandLandmarks,
                multiHandWorldLandmarks,
            } = hand;
            if (score > this.HAND_TRESHOLD) {
                this.processHand(
                    handId,
                    multiHandLandmarks,
                    multiHandWorldLandmarks,
                );
            }
        });

        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    processHand(
        handId: HandIdType,
        multiHandLandmarks: NormalizedLandmarkList,
        multiHandWorldLandmarks: LandmarkList,
    ) {
        // Hysteresis: ON requires closer contact than OFF to suppress noisy toggling
        const PINCH_ON_THRESHOLD: number = 0.03;   // ~4 cm in world coords
        const PINCH_OFF_THRESHOLD: number = 0.05;  // ~7 cm in world coords

        // Check the hand
        if (!this.pinchStateMap.has(handId)) {
            const defaultMap: Map<FingerPinch, boolean> = new Map();
            this.pinchStateMap.set(handId, defaultMap);
            defaultMap.set("Thumb_Finger", false);
            defaultMap.set("Thumb_Pinky", false);
        }
        // Check the finger
        const handMap = this.pinchStateMap.get(handId);
        if (!handMap || !multiHandWorldLandmarks) {
            return;
        }

        // 1. Measure 3D distances using world landmarks (metric scale, invariant to hand position)

        const thumb = multiHandWorldLandmarks[HandKey.THUMB_TIP];
        const indexFinger = multiHandWorldLandmarks[HandKey.INDEX_FINGER_TIP];
        const pinky = multiHandWorldLandmarks[HandKey.PINKY_TIP];

        const dist3D = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
            Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

        const distances: [FingerPinch, number][] = [
            ["Thumb_Finger", dist3D(thumb, indexFinger)],
            ["Thumb_Pinky", dist3D(thumb, pinky)],
        ];

        // 2. Apply hysteresis: emit only when state actually transitions
        for (const [finger_pair, dist] of distances) {
            const wasActive = handMap.get(finger_pair) ?? false;
            let isActive = wasActive;

            if (!wasActive && dist < PINCH_ON_THRESHOLD) {
                isActive = true;
            } else if (wasActive && dist > PINCH_OFF_THRESHOLD) {
                isActive = false;
            }

            if (isActive !== wasActive) {
                const eventName = `PINCH_${handId}_${finger_pair}_` + (isActive ? "ON" : "OFF");
                this.events.emit({
                    name: eventName,
                });
            }

            // 3. Update the current state
            handMap.set(finger_pair, isActive);
        }
    }
}