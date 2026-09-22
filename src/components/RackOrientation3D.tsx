import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Compass, 
  RotateCw, 
  Maximize2, 
  Eye, 
  Activity, 
  Sparkles, 
  Layers, 
  Sliders, 
  Target, 
  ShieldCheck, 
  Radio,
  RotateCcw
} from 'lucide-react';
import { HMRPose, Joint3D, ExperimentStep } from '../types';

interface RackOrientation3DProps {
  pose?: HMRPose;
  rackId: string;
  currentStep?: ExperimentStep;
  currentHOI?: any;
}

// 3D Point interface
interface Point3D {
  x: number; // rack-relative in meters (-0.6 to 0.6)
  y: number; // rack-relative in meters (-0.7 to 0.7)
  z: number; // depth from rack face in meters (-0.1 to 1.2)
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export const RackOrientation3D: React.FC<RackOrientation3DProps> = ({
  pose,
  rackId,
  currentStep,
  currentHOI,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera Orbit Controls State
  const [azimuth, setAzimuth] = useState<number>(-0.55); // ~ -32 deg horizontal orbit
  const [elevation, setElevation] = useState<number>(0.32); // ~ 18 deg vertical pitch
  const [zoom, setZoom] = useState<number>(1.05);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<'avatar' | 'skeleton'>('avatar');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; az: number; el: number }>({ x: 0, y: 0, az: 0, el: 0 });

  // Smoothed joints ref for fluid real-time animation
  const smoothedJointsRef = useRef<Record<string, Point3D>>({});
  const animFrameRef = useRef<number | null>(null);

  // Active target object coords from currentStep
  const targetRackCoords = currentStep?.rackRelativeCoords || { x: 0.0, y: 0.05, z: 0.2 };

  // Mouse / Touch Drag handlers for 3D Camera Orbit
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      az: azimuth,
      el: elevation,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setAzimuth(dragStartRef.current.az + dx * 0.008);
    setElevation(Math.max(-0.2, Math.min(1.4, dragStartRef.current.el + dy * 0.008)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Preset Views
  const applyViewPreset = (type: 'isometric' | 'side' | 'top' | 'front') => {
    setAutoRotate(false);
    if (type === 'isometric') {
      setAzimuth(-0.55);
      setElevation(0.32);
      setZoom(1.05);
    } else if (type === 'side') {
      setAzimuth(-Math.PI / 2 + 0.1);
      setElevation(0.05);
      setZoom(1.1);
    } else if (type === 'top') {
      setAzimuth(0);
      setElevation(Math.PI / 2 - 0.08);
      setZoom(1.15);
    } else if (type === 'front') {
      setAzimuth(0);
      setElevation(0.02);
      setZoom(1.0);
    }
  };

  // 3D Projection Helper
  const project3D = useCallback((
    pt: Point3D,
    w: number,
    h: number,
    rotY: number,
    rotX: number,
    currentZoom: number
  ): ProjectedPoint => {
    // Center of scene offset (rack face at Z=0, astronaut floating around Z=0.5m)
    const sceneCenterZ = 0.42;
    const sceneCenterY = 0.0;
    const zRel = pt.z - sceneCenterZ;
    const yRel = pt.y - sceneCenterY;

    // Y-axis rotation (azimuth orbit)
    const x1 = pt.x * Math.cos(rotY) - zRel * Math.sin(rotY);
    const z1 = pt.x * Math.sin(rotY) + zRel * Math.cos(rotY);

    // X-axis rotation (elevation pitch)
    const y2 = yRel * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = yRel * Math.sin(rotX) + z1 * Math.cos(rotX);

    // Perspective projection
    const camDistance = 2.4;
    const depth = z2 + camDistance;
    const fov = 350 * currentZoom;
    const scale = fov / Math.max(0.2, depth);

    return {
      x: w / 2 + x1 * scale,
      y: h / 2 - y2 * scale, // Canvas Y is downwards
      depth,
      scale,
    };
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAzimuth = azimuth;

    const render = () => {
      // Auto-orbit increment if enabled
      if (autoRotate) {
        localAzimuth += 0.005;
        setAzimuth(localAzimuth);
      } else {
        localAzimuth = azimuth;
      }

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 380;
      const displayHeight = canvas.clientHeight || 260;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = displayWidth;
      const h = displayHeight;

      // 1. Deep Space Lab Background
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
      bgGrad.addColorStop(0, '#0d1527');
      bgGrad.addColorStop(0.6, '#080d19');
      bgGrad.addColorStop(1, '#04070d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle zero-g space particle dust
      const timeMs = performance.now();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      for (let i = 0; i < 24; i++) {
        const px = (Math.sin(i * 19.3 + timeMs * 0.0003) * 0.5 + 0.5) * w;
        const py = (Math.cos(i * 31.7 + timeMs * 0.0004) * 0.5 + 0.5) * h;
        const pr = (Math.sin(i * 7.1) + 1.2);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Projection closure
      const prj = (pt: Point3D) => project3D(pt, w, h, localAzimuth, elevation, zoom);

      // 2. Draw Payload EXPRESS Rack Wireframe Chamber (Z = 0 is rack face)
      const rackW = 0.88; // meters
      const rackH = 1.15; // meters
      const rackDepth = -0.35; // recessed into wall

      const rw2 = rackW / 2;
      const rh2 = rackH / 2;

      // Front Face Corners (Z = 0)
      const rF_TL = prj({ x: -rw2, y: rh2, z: 0 });
      const rF_TR = prj({ x: rw2, y: rh2, z: 0 });
      const rF_BR = prj({ x: rw2, y: -rh2, z: 0 });
      const rF_BL = prj({ x: -rw2, y: -rh2, z: 0 });

      // Back Wall Corners (Z = rackDepth)
      const rB_TL = prj({ x: -rw2, y: rh2, z: rackDepth });
      const rB_TR = prj({ x: rw2, y: rh2, z: rackDepth });
      const rB_BR = prj({ x: rw2, y: -rh2, z: rackDepth });
      const rB_BL = prj({ x: -rw2, y: -rh2, z: rackDepth });

      // Rack Back Wall Fill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.moveTo(rB_TL.x, rB_TL.y);
      ctx.lineTo(rB_TR.x, rB_TR.y);
      ctx.lineTo(rB_BR.x, rB_BR.y);
      ctx.lineTo(rB_BL.x, rB_BL.y);
      ctx.closePath();
      ctx.fill();

      // Back Wall Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let gy = -0.4; gy <= 0.4; gy += 0.2) {
        const p1 = prj({ x: -rw2, y: gy, z: rackDepth });
        const p2 = prj({ x: rw2, y: gy, z: rackDepth });
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Connecting depth edges (Back to Front)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rB_TL.x, rB_TL.y); ctx.lineTo(rF_TL.x, rF_TL.y);
      ctx.moveTo(rB_TR.x, rB_TR.y); ctx.lineTo(rF_TR.x, rF_TR.y);
      ctx.moveTo(rB_BR.x, rB_BR.y); ctx.lineTo(rF_BR.x, rF_BR.y);
      ctx.moveTo(rB_BL.x, rB_BL.y); ctx.lineTo(rF_BL.x, rF_BL.y);
      ctx.stroke();

      // Front Rack Fascia Outer Border
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(rF_TL.x, rF_TL.y);
      ctx.lineTo(rF_TR.x, rF_TR.y);
      ctx.lineTo(rF_BR.x, rF_BR.y);
      ctx.lineTo(rF_BL.x, rF_BL.y);
      ctx.closePath();
      ctx.stroke();

      // Rack Front Face Crosshairs / Center Boresight
      const rCenter = prj({ x: 0, y: 0, z: 0 });
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(rCenter.x - 14, rCenter.y); ctx.lineTo(rCenter.x + 14, rCenter.y);
      ctx.moveTo(rCenter.x, rCenter.y - 14); ctx.lineTo(rCenter.x, rCenter.y + 14);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner Fiducial Markers (QR Target corners)
      const drawFiducial = (p: ProjectedPoint, label: string) => {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '8px monospace';
        ctx.fillText(label, p.x + 8, p.y + 3);
      };
      drawFiducial(rF_TL, 'FID-UL');
      drawFiducial(rF_TR, 'FID-UR');
      drawFiducial(rF_BL, 'FID-LL');
      drawFiducial(rF_BR, 'FID-LR');

      // 3. Draw Payload Experiment Modules on Rack Face
      const modules = [
        { name: 'HEPA Purge & Airlock', x: -0.25, y: 0.4, w: 0.28, h: 0.22, color: '#06b6d4', id: 'step-rack-init' },
        { name: 'Cryo-Slot 03 (-80°C)', x: 0.18, y: -0.2, w: 0.24, h: 0.22, color: '#38bdf8', id: 'step-reagent-retrieve' },
        { name: 'Glovebox & Well Tray', x: 0.0, y: 0.06, w: 0.36, h: 0.26, color: '#10b981', id: 'step-pipette-mix' },
        { name: 'Centrifuge Bay', x: -0.32, y: -0.16, w: 0.22, h: 0.22, color: '#f59e0b', id: 'step-centrifuge-cycle' },
        { name: 'OCT Spectrometer', x: 0.28, y: 0.34, w: 0.24, h: 0.2, color: '#8b5cf6', id: 'step-spectrometer-scan' },
        { name: 'Bio-Waste Stow', x: 0.32, y: -0.38, w: 0.22, h: 0.18, color: '#f43f5e', id: 'step-waste-stow' },
      ];

      modules.forEach((mod) => {
        const isCurrentTarget = currentStep?.id === mod.id;
        const mw2 = mod.w / 2;
        const mh2 = mod.h / 2;
        const pTL = prj({ x: mod.x - mw2, y: mod.y + mh2, z: 0 });
        const pTR = prj({ x: mod.x + mw2, y: mod.y + mh2, z: 0 });
        const pBR = prj({ x: mod.x + mw2, y: mod.y - mh2, z: 0 });
        const pBL = prj({ x: mod.x - mw2, y: mod.y - mh2, z: 0 });

        ctx.fillStyle = isCurrentTarget ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.5)';
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isCurrentTarget ? '#38bdf8' : 'rgba(71, 85, 105, 0.6)';
        ctx.lineWidth = isCurrentTarget ? 2 : 1;
        ctx.stroke();

        // Pulsing target halo if active
        if (isCurrentTarget) {
          const pulse = (Math.sin(timeMs * 0.006) + 1) / 2;
          const center = prj({ x: mod.x, y: mod.y, z: 0 });
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(center.x, center.y, 14 + pulse * 8, 0, Math.PI * 2);
          ctx.stroke();

          // Target Label
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`TARGET: ${mod.name}`, center.x - 30, center.y - 18);
        }
      });

      // 4. Compute / Interpolate Real-Time 3D Astronaut Joints
      // Default nominal floating astronaut in microgravity
      const nominalPitch = pose?.rackOrientation.pitchDeg ?? 18;
      const nominalRoll = pose?.rackOrientation.rollDeg ?? -12;
      const nominalYaw = pose?.rackOrientation.yawDeg ?? 6;

      // Convert angles to radians
      const pitchRad = (nominalPitch * Math.PI) / 180;
      const rollRad = (nominalRoll * Math.PI) / 180;
      const yawRad = (nominalYaw * Math.PI) / 180;

      // Microgravity ambient floating bobbing
      const floatDy = Math.sin(timeMs * 0.0018) * 0.025;
      const floatDz = Math.cos(timeMs * 0.0015) * 0.02;

      // Center of Mass in rack coordinate space (floating at Z = ~0.48m in front of rack)
      const baseCom: Point3D = {
        x: pose?.centerOfMass?.x ?? 0.04,
        y: (pose?.centerOfMass?.y ?? 0.02) + floatDy,
        z: (pose?.centerOfMass?.z ?? 0.46) + floatDz,
      };

      // Extract joints from pose or construct rotated IVA space suit skeleton
      const currentJointsMap: Record<string, Point3D> = {};

      if (pose?.joints && pose.joints.length >= 10) {
        // Map available joints
        pose.joints.forEach((j) => {
          currentJointsMap[j.name] = {
            x: j.x,
            y: j.y + floatDy * 0.5,
            z: Math.max(0.15, j.z || 0.45),
          };
        });
      }

      // Fallback/Synthesis for any missing key anatomical points
      const rotVec = (vx: number, vy: number, vz: number): Point3D => {
        // Roll around Z
        const x1 = vx * Math.cos(rollRad) - vy * Math.sin(rollRad);
        const y1 = vx * Math.sin(rollRad) + vy * Math.cos(rollRad);
        // Pitch around X
        const y2 = y1 * Math.cos(pitchRad) - vz * Math.sin(pitchRad);
        const z2 = y1 * Math.sin(pitchRad) + vz * Math.cos(pitchRad);
        // Yaw around Y
        const x3 = x1 * Math.cos(yawRad) + z2 * Math.sin(yawRad);
        const z3 = -x1 * Math.sin(yawRad) + z2 * Math.cos(yawRad);
        return {
          x: baseCom.x + x3,
          y: baseCom.y + y2,
          z: baseCom.z + z3,
        };
      };

      const getJoint = (name: string, defaultLocal: [number, number, number]): Point3D => {
        if (currentJointsMap[name]) return currentJointsMap[name];
        return rotVec(defaultLocal[0], defaultLocal[1], defaultLocal[2]);
      };

      // Key anatomical joints for the astronaut avatar
      const pelvis = getJoint('Pelvis', [0, -0.08, 0]);
      const spineMid = getJoint('SpineMid', [0, 0.08, 0.02]);
      const neck = getJoint('Neck', [0, 0.24, 0.03]);
      const head = getJoint('Nose', [0, 0.36, 0.06]);

      const rShoulder = getJoint('RightShoulder', [0.18, 0.22, 0.02]);
      const rElbow = getJoint('RightElbow', [0.24, 0.06, -0.08]);
      const rWrist = getJoint('RightWrist', [0.16, -0.05, -0.22]);

      const lShoulder = getJoint('LeftShoulder', [-0.18, 0.22, 0.02]);
      const lElbow = getJoint('LeftElbow', [-0.26, 0.08, 0.05]);
      const lWrist = getJoint('LeftWrist', [-0.22, 0.18, -0.12]);

      const rHip = getJoint('RightHip', [0.11, -0.14, 0]);
      const rKnee = getJoint('RightKnee', [0.13, -0.34, 0.12]);
      const rAnkle = getJoint('RightAnkle', [0.15, -0.52, 0.24]);

      const lHip = getJoint('LeftHip', [-0.11, -0.14, 0]);
      const lKnee = getJoint('LeftKnee', [-0.14, -0.32, 0.14]);
      const lAnkle = getJoint('LeftAnkle', [-0.16, -0.50, 0.26]);

      // Exponential moving average smoothing for fluid animation
      const lerpPt = (target: Point3D, key: string, alpha = 0.35): Point3D => {
        const prev = smoothedJointsRef.current[key] || target;
        const smoothed = {
          x: prev.x + (target.x - prev.x) * alpha,
          y: prev.y + (target.y - prev.y) * alpha,
          z: prev.z + (target.z - prev.z) * alpha,
        };
        smoothedJointsRef.current[key] = smoothed;
        return smoothed;
      };

      const sPelvis = lerpPt(pelvis, 'Pelvis');
      const sSpineMid = lerpPt(spineMid, 'SpineMid');
      const sNeck = lerpPt(neck, 'Neck');
      const sHead = lerpPt(head, 'Nose');

      const sRShoulder = lerpPt(rShoulder, 'RShoulder');
      const sRElbow = lerpPt(rElbow, 'RElbow');
      const sRWrist = lerpPt(rWrist, 'RWrist');

      const sLShoulder = lerpPt(lShoulder, 'LShoulder');
      const sLElbow = lerpPt(lElbow, 'LElbow');
      const sLWrist = lerpPt(lWrist, 'LWrist');

      const sRHip = lerpPt(rHip, 'RHip');
      const sRKnee = lerpPt(rKnee, 'RKnee');
      const sRAnkle = lerpPt(rAnkle, 'RAnkle');

      const sLHip = lerpPt(lHip, 'LHip');
      const sLKnee = lerpPt(lKnee, 'LKnee');
      const sLAnkle = lerpPt(lAnkle, 'LAnkle');

      // Project all joints to 2D screen space
      const pHead = prj(sHead);
      const pNeck = prj(sNeck);
      const pSpineMid = prj(sSpineMid);
      const pPelvis = prj(sPelvis);

      const pRShoulder = prj(sRShoulder);
      const pRElbow = prj(sRElbow);
      const pRWrist = prj(sRWrist);

      const pLShoulder = prj(sLShoulder);
      const pLElbow = prj(sLElbow);
      const pLWrist = prj(sLWrist);

      const pRHip = prj(sRHip);
      const pRKnee = prj(sRKnee);
      const pRAnkle = prj(sRAnkle);

      const pLHip = prj(sLHip);
      const pLKnee = prj(sLKnee);
      const pLAnkle = prj(sLAnkle);

      // 5. Hand-Object Interaction (HOI) Laser Ray
      // Active hand reaching to active target on rack
      const activeHandPt = sRWrist;
      const targetPt: Point3D = {
        x: targetRackCoords.x,
        y: targetRackCoords.y,
        z: 0.02,
      };

      const pActiveHand = prj(activeHandPt);
      const pTargetObj = prj(targetPt);

      // Calculate true 3D Euclidean distance in centimeters
      const distM = Math.sqrt(
        Math.pow(activeHandPt.x - targetPt.x, 2) +
        Math.pow(activeHandPt.y - targetPt.y, 2) +
        Math.pow(activeHandPt.z - targetPt.z, 2)
      );
      const distCm = (distM * 100).toFixed(1);

      // Draw HOI Dynamic Laser Ray
      ctx.save();
      ctx.strokeStyle = distM < 0.25 ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pActiveHand.x, pActiveHand.y);
      ctx.lineTo(pTargetObj.x, pTargetObj.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance tag on the ray midpoint
      const midRayX = (pActiveHand.x + pTargetObj.x) / 2;
      const midRayY = (pActiveHand.y + pTargetObj.y) / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(midRayX - 22, midRayY - 14, 44, 16);
      ctx.strokeStyle = distM < 0.25 ? '#f59e0b' : '#38bdf8';
      ctx.strokeRect(midRayX - 22, midRayY - 14, 44, 16);
      ctx.fillStyle = distM < 0.25 ? '#fef08a' : '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${distCm}cm`, midRayX, midRayY - 3);
      ctx.textAlign = 'left';
      ctx.restore();

      // 6. RENDER THE ASTRONAUT
      if (renderMode === 'avatar') {
        // FULL 3D INTRA-VEHICULAR SPACE SUIT AVATAR

        // Helper to draw shaded cylindrical space suit limb
        const drawSuitLimb = (
          p1: ProjectedPoint, 
          p2: ProjectedPoint, 
          radius1: number, 
          radius2: number, 
          accentColor = '#38bdf8'
        ) => {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) return;

          const nx = -dy / len;
          const ny = dx / len;

          const r1 = radius1 * (p1.scale / 140);
          const r2 = radius2 * (p2.scale / 140);

          ctx.save();
          // Limb Body Polygon
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
          ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
          ctx.lineTo(p2.x - nx * r2, p2.y - ny * r2);
          ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
          ctx.closePath();

          const limbGrad = ctx.createLinearGradient(
            p1.x + nx * r1, p1.y + ny * r1,
            p1.x - nx * r1, p1.y - ny * r1
          );
          limbGrad.addColorStop(0, '#f1f5f9');
          limbGrad.addColorStop(0.35, '#cbd5e1');
          limbGrad.addColorStop(0.8, '#64748b');
          limbGrad.addColorStop(1, '#334155');

          ctx.fillStyle = limbGrad;
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Pressurized rib bands
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.2;
          for (let f = 0.3; f <= 0.7; f += 0.2) {
            const mx = p1.x + dx * f;
            const my = p1.y + dy * f;
            const mr = (r1 * (1 - f) + r2 * f) * 0.9;
            ctx.beginPath();
            ctx.moveTo(mx + nx * mr, my + ny * mr);
            ctx.lineTo(mx - nx * mr, my - ny * mr);
            ctx.stroke();
          }

          // Joint Node Bearings
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, r1 * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        };

        // A. Primary Life Support System (PLSS) Backpack (rendered behind if facing front)
        const packW = 28 * (pSpineMid.scale / 140);
        const packH = 40 * (pSpineMid.scale / 140);
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pSpineMid.x - packW / 2, pSpineMid.y - packH / 2 + 5, packW, packH, 6);
        ctx.fill();
        ctx.stroke();
        // Twin Oxygen Tank cylinders
        ctx.fillStyle = '#475569';
        ctx.fillRect(pSpineMid.x - packW / 2 + 4, pSpineMid.y - packH / 2 + 2, 7, packH - 6);
        ctx.fillRect(pSpineMid.x + packW / 2 - 11, pSpineMid.y - packH / 2 + 2, 7, packH - 6);
        // Safety telemetry strobe
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pSpineMid.x + packW / 2 - 4, pSpineMid.y - packH / 2 + 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // B. Legs (Hips -> Knees -> Ankles)
        drawSuitLimb(pLHip, pLKnee, 11, 9, '#38bdf8');
        drawSuitLimb(pLKnee, pLAnkle, 9, 8, '#38bdf8');
        drawSuitLimb(pRHip, pRKnee, 11, 9, '#38bdf8');
        drawSuitLimb(pRKnee, pRAnkle, 9, 8, '#38bdf8');

        // Magnetic Microgravity Boots
        const drawBoot = (pAnkle: ProjectedPoint) => {
          const bW = 14 * (pAnkle.scale / 140);
          const bH = 8 * (pAnkle.scale / 140);
          ctx.save();
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pAnkle.x - bW / 2, pAnkle.y, bW, bH, 3);
          ctx.fill();
          ctx.stroke();
          // Magnetic sole plate
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(pAnkle.x - bW / 2 + 1, pAnkle.y + bH - 2, bW - 2, 2);
          ctx.restore();
        };
        drawBoot(pLAnkle);
        drawBoot(pRAnkle);

        // C. Torso (Pelvis -> SpineMid -> Neck / Shoulders)
        ctx.save();
        const torsoW1 = 28 * (pSpineMid.scale / 140);
        const torsoW2 = 20 * (pPelvis.scale / 140);
        ctx.beginPath();
        ctx.moveTo(pLShoulder.x, pLShoulder.y);
        ctx.lineTo(pRShoulder.x, pRShoulder.y);
        ctx.lineTo(pRHip.x, pRHip.y);
        ctx.lineTo(pLHip.x, pLHip.y);
        ctx.closePath();

        const torsoGrad = ctx.createLinearGradient(
          pLShoulder.x, pLShoulder.y,
          pRShoulder.x, pRShoulder.y
        );
        torsoGrad.addColorStop(0, '#f8fafc');
        torsoGrad.addColorStop(0.5, '#e2e8f0');
        torsoGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = torsoGrad;
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Chest Utility Display & Mission Emblem
        const chestX = (pSpineMid.x + pNeck.x) / 2;
        const chestY = (pSpineMid.y + pNeck.y) / 2;
        const cW = 16 * (pSpineMid.scale / 140);
        const cH = 10 * (pSpineMid.scale / 140);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(chestX - cW / 2, chestY - cH / 2, cW, cH);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(chestX - cW / 2, chestY - cH / 2, cW, cH);

        // Avionics status LED on chest
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(chestX - cW / 2 + 3, chestY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = '6px monospace';
        ctx.fillText('EVA-1', chestX - cW / 2 + 6, chestY + 2.5);
        ctx.restore();

        // D. Arms (Shoulders -> Elbows -> Wrists)
        drawSuitLimb(pLShoulder, pLElbow, 10, 8, '#38bdf8');
        drawSuitLimb(pLElbow, pLWrist, 8, 7, '#38bdf8');
        drawSuitLimb(pRShoulder, pRElbow, 10, 8, '#38bdf8');
        drawSuitLimb(pRElbow, pRWrist, 8, 7, '#38bdf8');

        // EVA Space Gloves
        const drawGlove = (pWrist: ProjectedPoint, isRight: boolean) => {
          const gR = 7 * (pWrist.scale / 140);
          ctx.save();
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(pWrist.x, pWrist.y, gR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Reinforced dark fingertips
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(pWrist.x + (isRight ? 2 : -2), pWrist.y - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Active manipulation indicator
          if (isRight && distM < 0.25) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pWrist.x, pWrist.y, gR + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        };
        drawGlove(pLWrist, false);
        drawGlove(pRWrist, true);

        // E. Helmet & Reflective Gold Visor
        ctx.save();
        const helmetR = 15 * (pHead.scale / 140);

        // Outer white helmet shell
        ctx.beginPath();
        ctx.arc(pHead.x, pHead.y, helmetR, 0, Math.PI * 2);
        const hGrad = ctx.createRadialGradient(
          pHead.x - helmetR * 0.3, pHead.y - helmetR * 0.3, helmetR * 0.2,
          pHead.x, pHead.y, helmetR
        );
        hGrad.addColorStop(0, '#ffffff');
        hGrad.addColorStop(0.7, '#e2e8f0');
        hGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = hGrad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Helmet neck seal collar ring
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(pHead.x, pHead.y + helmetR * 0.8, helmetR * 0.8, helmetR * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Curved Gold Sun Visor (Shaded with specular reflection)
        const visorW = helmetR * 1.25;
        const visorH = helmetR * 0.95;
        ctx.beginPath();
        ctx.ellipse(pHead.x, pHead.y - 1, visorW / 2, visorH / 2, 0, 0, Math.PI * 2);

        const visorGrad = ctx.createLinearGradient(
          pHead.x - visorW / 2, pHead.y - visorH / 2,
          pHead.x + visorW / 2, pHead.y + visorH / 2
        );
        visorGrad.addColorStop(0, '#fef08a');
        visorGrad.addColorStop(0.25, '#fbbf24');
        visorGrad.addColorStop(0.65, '#d97706');
        visorGrad.addColorStop(1, '#78350f');

        ctx.fillStyle = visorGrad;
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Specular curved glare streak on visor
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pHead.x - visorW * 0.15, pHead.y - visorH * 0.1, visorW * 0.25, -Math.PI * 0.6, -Math.PI * 0.1);
        ctx.stroke();

        // Helmet mounted spotlight beam toward payload
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(pHead.x + 8, pHead.y - 6);
        ctx.lineTo(pTargetObj.x - 20, pTargetObj.y - 20);
        ctx.lineTo(pTargetObj.x + 20, pTargetObj.y + 20);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

      } else {
        // CYBERNETIC KINEMATIC 3D SKELETON MODE
        const drawBone = (p1: ProjectedPoint, p2: ProjectedPoint, color = '#38bdf8') => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Joint Node
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
          ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
          ctx.fill();
        };

        // Spine
        drawBone(pHead, pNeck, '#a855f7');
        drawBone(pNeck, pSpineMid, '#06b6d4');
        drawBone(pSpineMid, pPelvis, '#06b6d4');

        // Shoulders & Arms
        drawBone(pNeck, pRShoulder, '#38bdf8');
        drawBone(pRShoulder, pRElbow, '#38bdf8');
        drawBone(pRElbow, pRWrist, '#38bdf8');

        drawBone(pNeck, pLShoulder, '#38bdf8');
        drawBone(pLShoulder, pLElbow, '#38bdf8');
        drawBone(pLElbow, pLWrist, '#38bdf8');

        // Hips & Legs
        drawBone(pPelvis, pRHip, '#10b981');
        drawBone(pRHip, pRKnee, '#10b981');
        drawBone(pRKnee, pRAnkle, '#10b981');

        drawBone(pPelvis, pLHip, '#10b981');
        drawBone(pLHip, pLKnee, '#10b981');
        drawBone(pLKnee, pLAnkle, '#10b981');
      }

      // 7. Microgravity Body Orientation Horizon Disc at Astronaut Base
      ctx.save();
      const discCenter = prj({ x: sPelvis.x, y: sPelvis.y - 0.25, z: sPelvis.z });
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(discCenter.x, discCenter.y, 36, 12, rollRad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [azimuth, elevation, zoom, autoRotate, renderMode, pose, currentStep, project3D, targetRackCoords]);

  // Measured Pitch, Roll, Yaw
  const pitchDeg = pose?.rackOrientation.pitchDeg ?? 18;
  const rollDeg = pose?.rackOrientation.rollDeg ?? -12;
  const yawDeg = pose?.rackOrientation.yawDeg ?? 6;

  return (
    <div 
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl relative overflow-hidden flex flex-col gap-2"
    >
      {/* Top Header & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-cyan-400 font-bold tracking-wider">
                ASTRONAUT LIVE 3D MOVEMENT
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              MICROGRAVITY INVARIANT (PAYLOAD FRAME)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause 3D Orbit' : 'Auto-Orbit 3D View'}
            className={`p-1 rounded text-xs transition-colors ${
              autoRotate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setRenderMode(renderMode === 'avatar' ? 'skeleton' : 'avatar')}
            title="Toggle between IVA Space Suit Avatar and Kinematic Skeleton"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{renderMode === 'avatar' ? 'Space Suit' : 'Skeleton'}</span>
          </button>
        </div>
      </div>

      {/* Viewport Presets & View Controls Bar */}
      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Perspective:</span>
          <button
            onClick={() => applyViewPreset('isometric')}
            className={`px-1.5 py-0.5 rounded ${Math.abs(elevation - 0.32) < 0.1 && Math.abs(azimuth - -0.55) < 0.1 ? 'bg-cyan-900/60 text-cyan-300 font-bold border border-cyan-700' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'}`}
          >
            3D Orbit
          </button>
          <button
            onClick={() => applyViewPreset('side')}
            className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300"
          >
            Lateral Side
          </button>
          <button
            onClick={() => applyViewPreset('top')}
            className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300"
          >
            Top-Down
          </button>
          <button
            onClick={() => applyViewPreset('front')}
            className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300"
          >
            Boresight
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Zoom:</span>
          <button
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
          >
            -
          </button>
          <button
            onClick={() => applyViewPreset('isometric')}
            title="Reset View"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3D Interactive Canvas Viewport */}
      <div className="relative aspect-[16/10] w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center cursor-grab active:cursor-grabbing select-none group">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none"
        />

        {/* Drag Hint Overlay */}
        <div className="absolute top-2 left-2 pointer-events-none bg-slate-950/75 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 border border-slate-800/80 flex items-center gap-1">
          <Maximize2 className="w-2.5 h-2.5 text-cyan-400" />
          <span>DRAG TO ORBIT 360°</span>
        </div>

        {/* Floating Real-Time Microgravity Metrics Tag */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono border border-slate-800 flex items-center gap-2 text-slate-300">
          <span className="text-slate-400">Rack:</span>
          <span className="text-cyan-400 font-bold">{rackId}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Gravity:</span>
          <span className="text-emerald-400 font-bold">0.00g (FLOAT)</span>
        </div>

        {/* Floating Active Target Tag */}
        {currentStep && (
          <div className="absolute bottom-2 right-2 pointer-events-none bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono border border-cyan-800/60 flex items-center gap-1.5 text-cyan-300">
            <Target className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400">Target:</span>
            <span className="text-white font-semibold truncate max-w-[120px]">
              {currentStep.expectedObjects[0] || currentStep.name}
            </span>
          </div>
        )}
      </div>

      {/* Real-Time Euler Orientation & Reach Metrics Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
          <div className="text-slate-400 text-[10px]">PITCH (θ_p)</div>
          <div className="text-emerald-400 font-bold text-sm">{pitchDeg.toFixed(1)}°</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
          <div className="text-slate-400 text-[10px]">ROLL (θ_r)</div>
          <div className="text-emerald-400 font-bold text-sm">{rollDeg.toFixed(1)}°</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
          <div className="text-slate-400 text-[10px]">YAW (θ_y)</div>
          <div className="text-emerald-400 font-bold text-sm">{yawDeg.toFixed(1)}°</div>
        </div>

        <div className="col-span-3 sm:col-span-1 bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
          <div className="text-slate-400 text-[10px]">REACH DISTANCE</div>
          <div className="text-cyan-400 font-bold text-sm">
            {currentHOI?.distanceMeters ? `${(currentHOI.distanceMeters * 100).toFixed(1)}cm` : '18.4cm'}
          </div>
        </div>
      </div>

      {/* Kinematic Invariance Explanation */}
      <div className="text-[10px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/60 leading-relaxed">
        <span className="text-cyan-400 font-semibold">Orientation-Agnostic Kinematics:</span> Astronaut body motion is projected into the EXPRESS rack reference frame, eliminating zero-g rotational drift so actions are recognized regardless of body angle.
      </div>
    </div>
  );
};
