import { AfterViewInit, Component } from '@angular/core';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { convertMediaPipeToCurrent } from '@avatar/utils/AvatarUtilities';


@Component({
  selector: 'app-media-pipe-pose',
  imports: [],
  templateUrl: './media-pipe-pose.html',
  styleUrl: './media-pipe-pose.scss',
})
export class MediaPipePose implements AfterViewInit {
  camera: Camera | null = null;
  lastResults: Results | null = null;
  ngAfterViewInit(): void {
    const video: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas || !video) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return
    }

    // 1. Create the Pose detector
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,        // 0 (fast) | 1 | 2 (accurate)
      smoothLandmarks: true,
      smoothWorldLandmarks: true, // valid runtime option, missing from @mediapipe/pose typings
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    } as any);

    // 2. Handle results — draw skeleton on canvas
    pose.onResults((results) => {
      this.lastResults = results;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror the camera feed
      ctx.save();
      ctx.scale(1, 1);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw 2D skeleton overlay using normalized image landmarks
      if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,
          { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(ctx, results.poseLandmarks,
          { color: '#FF0000', lineWidth: 1, radius: 4 });
      }

      // 3D world landmarks: origin at hips center, coordinates in meters
      // Each point: { x, y, z, visibility }
      if (results.poseWorldLandmarks) {
        //console.log('3D world landmarks:', results.poseWorldLandmarks);
      }
    });

    // 3. Start the camera loop
    this.camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
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
    const converted = convertMediaPipeToCurrent(this.lastResults);
    if (!converted) { return; }
    console.log(JSON.stringify(converted.keypoints3D, null, 4));
  }

  print2D() {
    if (!this.lastResults) {
      return;
    }
    const converted = convertMediaPipeToCurrent(this.lastResults);
    if (!converted) { return; }
    console.log(JSON.stringify(converted.keypoints, null, 4));
  }
}
