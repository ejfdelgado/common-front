import { AfterViewInit, Component } from '@angular/core';
import {
  DrawingUtils,
  FilesetResolver,
  Landmark,
  NormalizedLandmark,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import { Camera } from '@avatar/Camera';
import { convertMediaPipeToCurrent } from '@avatar/utils/AvatarUtilities';
import { GenericSizeType, MEDIA_PIPE_ROOT, MediaPipePoseEnum, POSE_MODELS_ROOT, TASKS_VISION_VERSION } from '@mytypes/BodyTypes';

interface PoseFrameResult {
  poseLandmarks?: NormalizedLandmark[];
  poseWorldLandmarks?: Landmark[];
}

@Component({
  selector: 'app-media-pipe-pose',
  imports: [],
  templateUrl: './media-pipe-pose.html',
  styleUrl: './media-pipe-pose.scss',
})
export class MediaPipePose implements AfterViewInit {
  camera: Camera | null = null;
  lastResults: PoseFrameResult | null = null;
  lastTimestamp: number = -1;

  async ngAfterViewInit(): Promise<void> {
    const video: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas || !video) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return
    }
    const drawingUtils = new DrawingUtils(ctx);

    // 1. Create the Pose detector
    const vision = await FilesetResolver.forVisionTasks(
      `${MEDIA_PIPE_ROOT}/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
    );
    const model = MediaPipePoseEnum.full; // lite (fast) | full | heavy (accurate)
    const pose = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${POSE_MODELS_ROOT}/${model}/float16/latest/${model}.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // 2. Detect and draw skeleton on canvas
    const onFrame = async () => {
      // VIDEO mode requires strictly increasing timestamps
      const timestamp = Math.max(performance.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;
      const result = pose.detectForVideo(video, timestamp);
      const results: PoseFrameResult = {
        poseLandmarks: result.landmarks[0],
        poseWorldLandmarks: result.worldLandmarks[0],
      };
      this.lastResults = results;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror the camera feed
      ctx.save();
      ctx.scale(1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw 2D skeleton overlay using normalized image landmarks
      if (results.poseLandmarks) {
        drawingUtils.drawConnectors(results.poseLandmarks, PoseLandmarker.POSE_CONNECTIONS,
          { color: '#00FF00', lineWidth: 2 });
        drawingUtils.drawLandmarks(results.poseLandmarks,
          { color: '#FF0000', lineWidth: 1, radius: 4 });
      }

      // 3D world landmarks: origin at hips center, coordinates in meters
      // Each point: { x, y, z, visibility }
      if (results.poseWorldLandmarks) {
        //console.log('3D world landmarks:', results.poseWorldLandmarks);
      }
    };

    // 3. Start the camera loop
    this.camera = new Camera(video, {
      onFrame,
      width: 640,
      height: 480
    });
  }

  start() {
    if (!this.camera) {
      return;
    }
    this.camera.start();
  }

  stop() {
    if (!this.camera) {
      return;
    }
    this.camera.stop();
  }

  print3D() {
    if (!this.lastResults) {
      return;
    }
    const videoSize: GenericSizeType = {
      width: 640,
      height: 480,
    };
    const converted = convertMediaPipeToCurrent(this.lastResults, videoSize);
    if (!converted) { return; }
    console.log(JSON.stringify(converted.keypoints3D, null, 4));
  }

  print2D() {
    if (!this.lastResults) {
      return;
    }
    const videoSize: GenericSizeType = {
      width: 640,
      height: 480,
    };
    const converted = convertMediaPipeToCurrent(this.lastResults, videoSize);
    if (!converted) { return; }
    console.log(JSON.stringify(converted.keypoints, null, 4));
  }
}
