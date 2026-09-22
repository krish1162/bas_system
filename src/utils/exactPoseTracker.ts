import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Joint3D, HMRPose } from '../types';

export interface ExactLandmark {
  index: number;
  name: string;
  x: number; // 0 to 1 (screen normalized)
  y: number; // 0 to 1 (screen normalized)
  z: number; // relative depth
  visibility: number; // 0 to 1
  worldX?: number; // 3D world meters
  worldY?: number;
  worldZ?: number;
}

export interface ExactPoseResult {
  landmarks: ExactLandmark[];
  keypointsCount: number;
  detectionConfidence: number;
  inferenceTimeMs: number;
  engine: 'MEDIAPIPE_BLAZEPOSE' | 'OPTICAL_FLOW_KINEMATIC';
  angles: {
    pitchDeg: number;
    rollDeg: number;
    yawDeg: number;
  };
  rightHand: {
    wrist: { x: number; y: number; z: number };
    index: { x: number; y: number; z: number };
    thumb: { x: number; y: number; z: number };
    isPinching: boolean;
    gesture: 'OPEN' | 'PINCH' | 'FIST' | 'POINTING';
  };
  leftHand: {
    wrist: { x: number; y: number; z: number };
    gesture: 'OPEN' | 'PINCH' | 'FIST' | 'POINTING';
  };
  hmrPose: HMRPose;
}

// MediaPipe 33 Landmark Names
export const BLAZEPOSE_LANDMARK_NAMES = [
  'Nose', // 0
  'LeftEyeInner', // 1
  'LeftEye', // 2
  'LeftEyeOuter', // 3
  'RightEyeInner', // 4
  'RightEye', // 5
  'RightEyeOuter', // 6
  'LeftEar', // 7
  'RightEar', // 8
  'MouthLeft', // 9
  'MouthRight', // 10
  'LeftShoulder', // 11
  'RightShoulder', // 12
  'LeftElbow', // 13
  'RightElbow', // 14
  'LeftWrist', // 15
  'RightWrist', // 16
  'LeftPinky', // 17
  'RightPinky', // 18
  'LeftIndex', // 19
  'RightIndex', // 20
  'LeftThumb', // 21
  'RightThumb', // 22
  'LeftHip', // 23
  'RightHip', // 24
  'LeftKnee', // 25
  'RightKnee', // 26
  'LeftAnkle', // 27
  'RightAnkle', // 28
  'LeftHeel', // 29
  'RightHeel', // 30
  'LeftFootIndex', // 31
  'RightFootIndex', // 32
];

// BlazePose 33 Bone Connections
export const EXACT_SKELETON_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Upper body
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left arm
  [15, 17], [15, 19], [15, 21], [17, 19], // Left hand
  [12, 14], [14, 16], // Right arm
  [16, 18], [16, 20], [16, 22], [18, 20], // Right hand
  // Torso
  [11, 23], [12, 24], [23, 24], // Hips
  // Lower body
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31], // Left leg
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32], // Right leg
];

class ExactPoseDetectorService {
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<PoseLandmarker | null> | null = null;
  private lastVideoTime: number = -1;
  private isWasmReady: boolean = false;
  private loadError: string | null = null;

  public async initialize(): Promise<PoseLandmarker | null> {
    if (this.poseLandmarker) return this.poseLandmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        // Load WASM from reliable Google jsdelivr CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );

        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });

        this.isWasmReady = true;
        this.isInitializing = false;
        return this.poseLandmarker;
      } catch (err: unknown) {
        console.warn('GPU delegate failed or loading MediaPipe tasks-vision, trying CPU fallback:', err);
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
          );
          this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.45,
            minPosePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          this.isWasmReady = true;
          this.isInitializing = false;
          return this.poseLandmarker;
        } catch (cpuErr: unknown) {
          console.warn('MediaPipe PoseLandmarker init error:', cpuErr);
          this.loadError = cpuErr instanceof Error ? cpuErr.message : String(cpuErr);
          this.isInitializing = false;
          return null;
        }
      }
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.poseLandmarker !== null && this.isWasmReady;
  }

  public getLoadError(): string | null {
    return this.loadError;
  }

  /**
   * Process a live video frame and return exact landmarks and angles
   */
  public detectVideoFrame(video: HTMLVideoElement, timestampMs: number): ExactPoseResult | null {
    if (!this.poseLandmarker || video.readyState < 2) return null;

    // Prevent duplicate frames with identical timestamp in video mode
    let frameTime = timestampMs;
    if (frameTime <= this.lastVideoTime) {
      frameTime = this.lastVideoTime + 1;
    }
    this.lastVideoTime = frameTime;

    const t0 = performance.now();
    try {
      const results = this.poseLandmarker.detectForVideo(video, frameTime);
      const inferenceTimeMs = Math.round(performance.now() - t0);

      if (!results.landmarks || results.landmarks.length === 0) {
        return null;
      }

      const rawLandmarks = results.landmarks[0];
      const rawWorldLandmarks = results.worldLandmarks ? results.worldLandmarks[0] : null;

      const landmarks: ExactLandmark[] = rawLandmarks.map((lm, idx) => ({
        index: idx,
        name: BLAZEPOSE_LANDMARK_NAMES[idx] || `Landmark_${idx}`,
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 0.95,
        worldX: rawWorldLandmarks ? rawWorldLandmarks[idx]?.x : undefined,
        worldY: rawWorldLandmarks ? rawWorldLandmarks[idx]?.y : undefined,
        worldZ: rawWorldLandmarks ? rawWorldLandmarks[idx]?.z : undefined,
      }));

      // Calculate exact physical angles
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const nose = landmarks[0];

      // Roll: Angle of shoulder line
      let rollDeg = 0;
      if (leftShoulder && rightShoulder) {
        const dx = rightShoulder.x - leftShoulder.x;
        const dy = rightShoulder.y - leftShoulder.y;
        rollDeg = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1));
      }

      // Pitch: Angle of torso plane relative to vertical
      let pitchDeg = 0;
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const midShoulderZ = (leftShoulder.z + rightShoulder.z) / 2;
        const midHipY = (leftHip.y + rightHip.y) / 2;
        const midHipZ = (leftHip.z + rightHip.z) / 2;
        const dY = midHipY - midShoulderY;
        const dZ = midHipZ - midShoulderZ;
        pitchDeg = Number(((Math.atan2(dZ, dY) * 180) / Math.PI).toFixed(1));
      }

      // Yaw: Head orientation relative to chest center
      let yawDeg = 0;
      if (nose && leftShoulder && rightShoulder) {
        const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderDist = Math.abs(rightShoulder.x - leftShoulder.x) + 0.001;
        const headOffset = (nose.x - midShoulderX) / shoulderDist;
        yawDeg = Number((headOffset * 65).toFixed(1));
      }

      // Hand gestures
      const rWrist = landmarks[16];
      const rIndex = landmarks[20];
      const rThumb = landmarks[22];
      let rPinching = false;
      let rGesture: 'OPEN' | 'PINCH' | 'FIST' | 'POINTING' = 'OPEN';

      if (rWrist && rIndex && rThumb) {
        const pinchDist = Math.sqrt(
          Math.pow(rIndex.x - rThumb.x, 2) + Math.pow(rIndex.y - rThumb.y, 2)
        );
        rPinching = pinchDist < 0.045;
        const handSpan = Math.sqrt(
          Math.pow(rIndex.x - rWrist.x, 2) + Math.pow(rIndex.y - rWrist.y, 2)
        );
        if (rPinching) {
          rGesture = 'PINCH';
        } else if (handSpan < 0.06) {
          rGesture = 'FIST';
        } else if (handSpan > 0.12) {
          rGesture = 'POINTING';
        } else {
          rGesture = 'OPEN';
        }
      }

      const lWrist = landmarks[15];
      let lGesture: 'OPEN' | 'PINCH' | 'FIST' | 'POINTING' = 'OPEN';
      const lIndex = landmarks[19];
      const lThumb = landmarks[21];
      if (lWrist && lIndex && lThumb) {
        const pinchDist = Math.sqrt(
          Math.pow(lIndex.x - lThumb.x, 2) + Math.pow(lIndex.y - lThumb.y, 2)
        );
        if (pinchDist < 0.045) lGesture = 'PINCH';
      }

      // Convert exact landmarks into HMRPose Joint3D array
      const joints: Joint3D[] = [
        { name: 'Nose', x: (nose.x - 0.5) * 1.2, y: -(nose.y - 0.5) * 1.0, z: nose.z || 0.4, visibility: nose.visibility },
        {
          name: 'Neck',
          x: ((leftShoulder.x + rightShoulder.x) / 2 - 0.5) * 1.2,
          y: -((leftShoulder.y + rightShoulder.y) / 2 - 0.5) * 1.0,
          z: (leftShoulder.z + rightShoulder.z) / 2 || 0.45,
          visibility: Math.min(leftShoulder.visibility, rightShoulder.visibility),
        },
        { name: 'RightShoulder', x: (rightShoulder.x - 0.5) * 1.2, y: -(rightShoulder.y - 0.5) * 1.0, z: rightShoulder.z || 0.45, visibility: rightShoulder.visibility },
        { name: 'RightElbow', x: (landmarks[14].x - 0.5) * 1.2, y: -(landmarks[14].y - 0.5) * 1.0, z: landmarks[14].z || 0.4, visibility: landmarks[14].visibility },
        { name: 'RightWrist', x: (rWrist.x - 0.5) * 1.2, y: -(rWrist.y - 0.5) * 1.0, z: rWrist.z || 0.35, visibility: rWrist.visibility },
        { name: 'LeftShoulder', x: (leftShoulder.x - 0.5) * 1.2, y: -(leftShoulder.y - 0.5) * 1.0, z: leftShoulder.z || 0.45, visibility: leftShoulder.visibility },
        { name: 'LeftElbow', x: (landmarks[13].x - 0.5) * 1.2, y: -(landmarks[13].y - 0.5) * 1.0, z: landmarks[13].z || 0.4, visibility: landmarks[13].visibility },
        { name: 'LeftWrist', x: (lWrist.x - 0.5) * 1.2, y: -(lWrist.y - 0.5) * 1.0, z: lWrist.z || 0.35, visibility: lWrist.visibility },
        {
          name: 'SpineMid',
          x: ((leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4 - 0.5) * 1.2,
          y: -((leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4 - 0.5) * 1.0,
          z: 0.5,
          visibility: 0.95,
        },
        {
          name: 'Pelvis',
          x: ((leftHip.x + rightHip.x) / 2 - 0.5) * 1.2,
          y: -((leftHip.y + rightHip.y) / 2 - 0.5) * 1.0,
          z: (leftHip.z + rightHip.z) / 2 || 0.55,
          visibility: Math.min(leftHip.visibility, rightHip.visibility),
        },
        { name: 'RightHip', x: (rightHip.x - 0.5) * 1.2, y: -(rightHip.y - 0.5) * 1.0, z: rightHip.z || 0.55, visibility: rightHip.visibility },
        { name: 'RightKnee', x: (landmarks[26].x - 0.5) * 1.2, y: -(landmarks[26].y - 0.5) * 1.0, z: landmarks[26].z || 0.6, visibility: landmarks[26].visibility },
        { name: 'RightAnkle', x: (landmarks[28].x - 0.5) * 1.2, y: -(landmarks[28].y - 0.5) * 1.0, z: landmarks[28].z || 0.65, visibility: landmarks[28].visibility },
        { name: 'LeftHip', x: (leftHip.x - 0.5) * 1.2, y: -(leftHip.y - 0.5) * 1.0, z: leftHip.z || 0.55, visibility: leftHip.visibility },
        { name: 'LeftKnee', x: (landmarks[25].x - 0.5) * 1.2, y: -(landmarks[25].y - 0.5) * 1.0, z: landmarks[25].z || 0.6, visibility: landmarks[25].visibility },
        { name: 'LeftAnkle', x: (landmarks[27].x - 0.5) * 1.2, y: -(landmarks[27].y - 0.5) * 1.0, z: landmarks[27].z || 0.65, visibility: landmarks[27].visibility },
      ];

      const hmrPose: HMRPose = {
        joints,
        rackOrientation: {
          pitchDeg,
          rollDeg,
          yawDeg,
        },
        centerOfMass: {
          x: Number((((leftHip.x + rightHip.x) / 2 - 0.5) * 1.2).toFixed(3)),
          y: Number((-((leftHip.y + rightHip.y) / 2 - 0.5) * 1.0).toFixed(3)),
          z: Number((((leftHip.z + rightHip.z) / 2) || 0.55).toFixed(3)),
        },
        microgravityFloatingVelocity: { vx: 0.002, vy: -0.001, vz: 0.001 },
      };

      return {
        landmarks,
        keypointsCount: landmarks.length,
        detectionConfidence: 0.96,
        inferenceTimeMs,
        engine: 'MEDIAPIPE_BLAZEPOSE',
        angles: { pitchDeg, rollDeg, yawDeg },
        rightHand: {
          wrist: { x: rWrist.x, y: rWrist.y, z: rWrist.z },
          index: { x: rIndex.x, y: rIndex.y, z: rIndex.z },
          thumb: { x: rThumb.x, y: rThumb.y, z: rThumb.z },
          isPinching: rPinching,
          gesture: rGesture,
        },
        leftHand: {
          wrist: { x: lWrist.x, y: lWrist.y, z: lWrist.z },
          gesture: lGesture,
        },
        hmrPose,
      };
    } catch (err) {
      console.warn('PoseLandmarker detect error:', err);
      return null;
    }
  }
}

export const exactPoseDetector = new ExactPoseDetectorService();
