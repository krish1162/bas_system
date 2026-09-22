import { Joint3D, HMRPose, DetectedObject } from '../types';

export const SKELETON_CONNECTIONS: [string, string][] = [
  ['Nose', 'Neck'],
  ['Neck', 'RightShoulder'],
  ['RightShoulder', 'RightElbow'],
  ['RightElbow', 'RightWrist'],
  ['Neck', 'LeftShoulder'],
  ['LeftShoulder', 'LeftElbow'],
  ['LeftElbow', 'LeftWrist'],
  ['Neck', 'SpineMid'],
  ['SpineMid', 'Pelvis'],
  ['Pelvis', 'RightHip'],
  ['RightHip', 'RightKnee'],
  ['RightKnee', 'RightAnkle'],
  ['Pelvis', 'LeftHip'],
  ['LeftHip', 'LeftKnee'],
  ['LeftKnee', 'LeftAnkle'],
];

/**
 * Generate synthetic or interpolated 3D joints in Rack-Relative Coordinates
 * based on experiment phase, astronaut drift, and pitch/roll angles.
 */
export function generateRackRelativePose(
  stepNumber: number,
  timeSec: number,
  targetObjectCoords: { x: number; y: number; z: number },
  userPitchDeg: number = 18,
  userRollDeg: number = -12,
  trackedCoordinates?: { 
    rightHand?: { x: number; y: number; z?: number }; 
    leftHand?: { x: number; y: number; z?: number }; 
    head?: { x: number; y: number };
  }
): HMRPose {
  // Microgravity gentle floating oscillation
  const driftX = Math.sin(timeSec * 0.8) * 0.03;
  const driftY = Math.cos(timeSec * 0.6) * 0.04;
  const driftZ = Math.sin(timeSec * 0.4) * 0.02;

  // Base astronaut body center in front of rack
  const pelvisX = 0.0 + driftX;
  const pelvisY = -0.15 + driftY;
  const pelvisZ = 0.65 + driftZ;

  // Orientation angle in degrees
  const pitchRad = (userPitchDeg * Math.PI) / 180;
  const rollRad = (userRollDeg * Math.PI) / 180;
  const yawRad = (Math.sin(timeSec * 0.3) * 15 * Math.PI) / 180;

  // Spine vector transformed by microgravity 3D rotation
  const spineLength = 0.28;
  const neckX = pelvisX + spineLength * Math.sin(rollRad);
  const neckY = pelvisY + spineLength * Math.cos(pitchRad);
  const neckZ = pelvisZ - spineLength * Math.sin(pitchRad);

  const headLength = 0.16;
  const noseX = trackedCoordinates?.head ? trackedCoordinates.head.x : (neckX + headLength * Math.sin(rollRad));
  const noseY = trackedCoordinates?.head ? trackedCoordinates.head.y : (neckY + headLength * Math.cos(pitchRad));
  const noseZ = neckZ - headLength * Math.sin(pitchRad);

  // Right arm reaches toward current step target object or follows real camera tracked hand
  const rightHandReachX = trackedCoordinates?.rightHand 
    ? trackedCoordinates.rightHand.x 
    : (targetObjectCoords.x + Math.sin(timeSec * 2.5) * 0.02);
  const rightHandReachY = trackedCoordinates?.rightHand 
    ? trackedCoordinates.rightHand.y 
    : (targetObjectCoords.y + Math.cos(timeSec * 2.5) * 0.02);
  const rightHandReachZ = trackedCoordinates?.rightHand?.z ?? (targetObjectCoords.z + 0.05);

  const rightShoulderX = neckX + 0.16;
  const rightShoulderY = neckY - 0.04;
  const rightShoulderZ = neckZ;

  const rightElbowX = (rightShoulderX + rightHandReachX) / 2 + 0.06;
  const rightElbowY = (rightShoulderY + rightHandReachY) / 2 - 0.08;
  const rightElbowZ = (rightShoulderZ + rightHandReachZ) / 2 + 0.04;

  // Left arm stabilizing against rack handhold rail or tracked left hand
  const leftShoulderX = neckX - 0.16;
  const leftShoulderY = neckY - 0.04;
  const leftShoulderZ = neckZ;

  const leftHandHoldX = trackedCoordinates?.leftHand ? trackedCoordinates.leftHand.x : -0.42;
  const leftHandHoldY = trackedCoordinates?.leftHand ? trackedCoordinates.leftHand.y : 0.1;
  const leftHandHoldZ = trackedCoordinates?.leftHand?.z ?? 0.3;

  const leftElbowX = (leftShoulderX + leftHandHoldX) / 2 - 0.05;
  const leftElbowY = (leftShoulderY + leftHandHoldY) / 2 - 0.06;
  const leftElbowZ = (leftShoulderZ + leftHandHoldZ) / 2;

  // Lower body floating relaxed in neutral body posture (NBP) typical of space flight
  const hipWidth = 0.12;
  const rightHipX = pelvisX + hipWidth;
  const rightHipY = pelvisY - 0.05;
  const rightHipZ = pelvisZ;

  const leftHipX = pelvisX - hipWidth;
  const leftHipY = pelvisY - 0.05;
  const leftHipZ = pelvisZ;

  const rightKneeX = rightHipX + 0.04;
  const rightKneeY = rightHipY - 0.28 + Math.sin(timeSec) * 0.02;
  const rightKneeZ = rightHipZ + 0.15;

  const rightAnkleX = rightKneeX + 0.02;
  const rightAnkleY = rightKneeY - 0.24;
  const rightAnkleZ = rightKneeZ + 0.1;

  const leftKneeX = leftHipX - 0.04;
  const leftKneeY = leftHipY - 0.26 - Math.cos(timeSec * 0.9) * 0.02;
  const leftKneeZ = leftHipZ + 0.18;

  const leftAnkleX = leftKneeX - 0.02;
  const leftAnkleY = leftKneeY - 0.23;
  const leftAnkleZ = leftKneeZ + 0.12;

  const joints: Joint3D[] = [
    { name: 'Nose', x: noseX, y: noseY, z: noseZ, visibility: 0.98 },
    { name: 'Neck', x: neckX, y: neckY, z: neckZ, visibility: 0.99 },
    { name: 'RightShoulder', x: rightShoulderX, y: rightShoulderY, z: rightShoulderZ, visibility: 0.96 },
    { name: 'RightElbow', x: rightElbowX, y: rightElbowY, z: rightElbowZ, visibility: 0.94 },
    { name: 'RightWrist', x: rightHandReachX, y: rightHandReachY, z: rightHandReachZ, visibility: 0.95 },
    { name: 'LeftShoulder', x: leftShoulderX, y: leftShoulderY, z: leftShoulderZ, visibility: 0.97 },
    { name: 'LeftElbow', x: leftElbowX, y: leftElbowY, z: leftElbowZ, visibility: 0.93 },
    { name: 'LeftWrist', x: leftHandHoldX, y: leftHandHoldY, z: leftHandHoldZ, visibility: 0.95 },
    { name: 'SpineMid', x: (pelvisX + neckX) / 2, y: (pelvisY + neckY) / 2, z: (pelvisZ + neckZ) / 2, visibility: 0.98 },
    { name: 'Pelvis', x: pelvisX, y: pelvisY, z: pelvisZ, visibility: 0.99 },
    { name: 'RightHip', x: rightHipX, y: rightHipY, z: rightHipZ, visibility: 0.95 },
    { name: 'RightKnee', x: rightKneeX, y: rightKneeY, z: rightKneeZ, visibility: 0.92 },
    { name: 'RightAnkle', x: rightAnkleX, y: rightAnkleY, z: rightAnkleZ, visibility: 0.90 },
    { name: 'LeftHip', x: leftHipX, y: leftHipY, z: leftHipZ, visibility: 0.95 },
    { name: 'LeftKnee', x: leftKneeX, y: leftKneeY, z: leftKneeZ, visibility: 0.92 },
    { name: 'LeftAnkle', x: leftAnkleX, y: leftAnkleY, z: leftAnkleZ, visibility: 0.89 },
  ];

  return {
    joints,
    rackOrientation: {
      pitchDeg: Number(userPitchDeg.toFixed(1)),
      rollDeg: Number(userRollDeg.toFixed(1)),
      yawDeg: Number(((yawRad * 180) / Math.PI).toFixed(1)),
    },
    centerOfMass: {
      x: Number(pelvisX.toFixed(3)),
      y: Number(pelvisY.toFixed(3)),
      z: Number(pelvisZ.toFixed(3)),
    },
    microgravityFloatingVelocity: {
      vx: Number((driftX * 2).toFixed(4)),
      vy: Number((driftY * 2).toFixed(4)),
      vz: Number((driftZ * 2).toFixed(4)),
    },
  };
}

/**
 * Calculate distance between astronaut wrist and target object
 */
export function calculateHOIDistance(
  wristCoords: { x: number; y: number; z: number },
  objectCoords: { x: number; y: number; z: number }
): { distanceMeters: number; state: 'Hovering' | 'Grasping' | 'Manipulating' | 'Released' } {
  const dx = wristCoords.x - objectCoords.x;
  const dy = wristCoords.y - objectCoords.y;
  const dz = wristCoords.z - objectCoords.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  let state: 'Hovering' | 'Grasping' | 'Manipulating' | 'Released' = 'Hovering';
  if (dist < 0.08) {
    state = 'Manipulating';
  } else if (dist < 0.16) {
    state = 'Grasping';
  } else if (dist < 0.35) {
    state = 'Hovering';
  } else {
    state = 'Released';
  }

  return {
    distanceMeters: Number(dist.toFixed(3)),
    state,
  };
}
