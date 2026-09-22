export interface ExperimentStep {
  stepNumber: number;
  id: string;
  name: string;
  description: string;
  expectedObjects: string[];
  targetHOI: string;
  requiredTools: string[];
  rackRelativeCoords: { x: number; y: number; z: number };
  safetyWarning?: string;
  nominalDurationSec: number;
  prerequisiteStepIds: string[];
}

export interface ExperimentProtocol {
  id: string;
  name: string;
  category: string;
  mission: string;
  payloadRackId: string;
  rackDimensions: { widthCm: number; heightCm: number; depthCm: number };
  originFiducial: string;
  description: string;
  totalEstimatedDurationSec: number;
  steps: ExperimentStep[];
}

export type StepVerificationStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'SKIPPED'
  | 'OUT_OF_SEQUENCE'
  | 'TOOL_MISMATCH';

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  metSeconds: number;
  experimentId: string;
  stepId: string;
  stepNumber: number;
  stepName: string;
  actionDetected: string;
  status: StepVerificationStatus;
  confidence: number;
  rackCoordinates: {
    x: number;
    y: number;
    z: number;
    pitchDeg: number;
    rollDeg: number;
    yawDeg: number;
  };
  handObjectInteraction: {
    hand: 'Left' | 'Right' | 'Both';
    targetObject: string;
    action: string;
    distanceMeters: number;
    contactState: 'Hovering' | 'Grasping' | 'Manipulating' | 'Released';
  };
  anomalyDetails?: string;
  edgeLatencyMs: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1
  rackCoords: { x: number; y: number; z: number };
  isTargetForCurrentStep: boolean;
}

export interface Joint3D {
  name: string;
  x: number; // rack relative -1 to 1
  y: number; // rack relative -1 to 1
  z: number; // rack relative depth 0 to 1
  visibility: number;
}

export interface HMRPose {
  joints: Joint3D[];
  rackOrientation: {
    pitchDeg: number; // relative to rack face
    rollDeg: number;
    yawDeg: number;
  };
  centerOfMass: { x: number; y: number; z: number };
  microgravityFloatingVelocity: { vx: number; vy: number; vz: number };
}

export interface StreamConfig {
  enabled: boolean;
  targetIp: string;
  targetPort: number;
  protocol: 'RTSP' | 'RTP/UDP' | 'WebRTC' | 'SRT';
  bitrateKbps: number;
  resolution: string;
  fps: number;
  bytesTransmitted: number;
  packetsSent: number;
  packetsDropped: number;
  simulatedRttMs: number;
}

export interface LocalStorageStatus {
  isRecording: boolean;
  durationSec: number;
  recordedBytes: number;
  totalDiskAvailableGb: number;
  savedClipsCount: number;
}

export interface SyntheticDataSample {
  sampleId: string;
  stepLabel: string;
  astronautPose: { pitch: number; roll: number; yaw: number };
  objectsPresent: string[];
  hoiTriplet: string;
  bboxCount: number;
  keypointsCount: number;
  timestamp: string;
}

export interface ActionRecognitionResult {
  actionName: string;
  category: 'MANIPULATION' | 'REACHING' | 'TRANSFER' | 'ROTATION' | 'INSPECTION' | 'IDLE';
  confidence: number;
  isStepMatch: boolean;
  matchedStepNumber?: number;
  handInvolved: 'Right' | 'Left' | 'Both' | 'None';
  motionIntensity: number; // 0 to 1
  zoneInteracted?: string;
  aiDetailedDescription?: string;
  detectedObjects?: string[];
  status: 'RECOGNIZING' | 'MATCH_CONFIRMED' | 'ANOMALY_DEVIATION' | 'IDLE';
  timestamp: string;
}

