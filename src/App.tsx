import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LiveCameraFeed } from './components/LiveCameraFeed';
import { StepSuggestionHUD } from './components/StepSuggestionHUD';
import { RackOrientation3D } from './components/RackOrientation3D';
import { StreamAndStoragePanel } from './components/StreamAndStoragePanel';
import { TelemetryLogViewer } from './components/TelemetryLogViewer';
import { DatasetAndModelDeliverable } from './components/DatasetAndModelDeliverable';
import { SequenceGraphView } from './components/SequenceGraphView';
import { AnomalyAlertModal } from './components/AnomalyAlertModal';
import { 
  ExperimentProtocol, 
  ExperimentStep, 
  StepVerificationStatus, 
  TelemetryLogEntry, 
  HMRPose 
} from './types';
import { playAvionicsAlertChime, speakVoiceAlert } from './utils/audio';

// Default initial experiment protocol
const INITIAL_EXPERIMENT: ExperimentProtocol = {
  id: 'exp-crystallization-01',
  name: 'Microgravity Protein Crystal Growth (MPCG-IV)',
  category: 'Structural Biology',
  mission: 'Lunar Gateway / BAS Module 2',
  payloadRackId: 'RACK-EXPRESS-04B',
  rackDimensions: { widthCm: 90, heightCm: 120, depthCm: 65 },
  originFiducial: 'FID-UPPER-LEFT-QR',
  description: 'Vapor diffusion crystallisation protocol for membrane protein macromolecules in microgravity.',
  totalEstimatedDurationSec: 420,
  steps: [
    {
      stepNumber: 1,
      id: 'step-rack-init',
      name: 'Rack Safety & Airlock Chamber Sanitization',
      description: 'Engage microgravity glovebox HEPA purge cycle and verify positive differential pressure (>25 Pa).',
      expectedObjects: ['Glovebox Chamber', 'HEPA Purge Dial', 'Digital Pressure Gauge'],
      targetHOI: 'AstronautHand rotates HEPA Purge Dial to 100%',
      requiredTools: ['Cleanroom Nitrile Gloves', 'Alcohol Swab Pack'],
      rackRelativeCoords: { x: -0.25, y: 0.4, z: 0.3 },
      safetyWarning: 'Ensure seal integrity before inserting pipettes.',
      nominalDurationSec: 45,
      prerequisiteStepIds: [],
    },
    {
      stepNumber: 2,
      id: 'step-reagent-retrieve',
      name: 'Retrieve Protein Macromolecule Cryovials',
      description: 'Extract Cryovial A (Lysozyme 50mg/mL) and Cryovial B (Precipitant Buffer) from -80°C Cryo-Rack slot 03.',
      expectedObjects: ['Cryo-Rack Slot 03', 'Cryovial Alpha', 'Cryovial Beta', 'Cryo Tongs'],
      targetHOI: 'AstronautHand holds Cryo Tongs extracting Cryovial Alpha',
      requiredTools: ['Cryo Tongs', 'Thermal Insulated Glove Clip'],
      rackRelativeCoords: { x: 0.15, y: -0.2, z: 0.25 },
      safetyWarning: 'Thermal hazard: Do not handle cryo-vials directly without insulated tongs.',
      nominalDurationSec: 60,
      prerequisiteStepIds: ['step-rack-init'],
    },
    {
      stepNumber: 3,
      id: 'step-pipette-mix',
      name: 'Precision Micropipette Aspiration & Mixing',
      description: 'Aspirate 20 µL protein solution and dispense into crystallization well tray plate without bubble induction.',
      expectedObjects: ['Micropipette P-20', 'Well Tray Plate', 'Vial Alpha', 'Disposable Filter Tips'],
      targetHOI: 'AstronautHand aspirates 20uL into Well Tray Plate',
      requiredTools: ['Micropipette P-20', 'Crystallization Well Plate'],
      rackRelativeCoords: { x: 0.0, y: 0.05, z: 0.18 },
      safetyWarning: 'Microgravity surface tension caution: Slowly eject to prevent droplet detachment into air.',
      nominalDurationSec: 90,
      prerequisiteStepIds: ['step-reagent-retrieve'],
    },
    {
      stepNumber: 4,
      id: 'step-centrifuge-cycle',
      name: 'Hermetic Well Sealing & Centrifuge Balance',
      description: 'Apply silicone optical film seal over well plate, insert into microfuge rotor with counter-weight, and lock latch.',
      expectedObjects: ['Centrifuge Rotor', 'Optical Film Roll', 'Centrifuge Latch Lock', 'Well Tray Plate'],
      targetHOI: 'AstronautHand closes Centrifuge Latch Lock',
      requiredTools: ['Centrifuge Counterbalance Tube', 'Silicon Sealing Roller'],
      rackRelativeCoords: { x: -0.35, y: -0.15, z: 0.22 },
      safetyWarning: 'CRITICAL: Must load counterbalance tube at 180 degrees before closing lid.',
      nominalDurationSec: 60,
      prerequisiteStepIds: ['step-pipette-mix'],
    },
    {
      stepNumber: 5,
      id: 'step-spectrometer-scan',
      name: 'Optical Interferometer Sensor Alignment & Scan',
      description: 'Transfer tray to Optical Coherence Tomography (OCT) drawer and trigger baseline diffraction raster scan.',
      expectedObjects: ['OCT Chamber Drawer', 'Optical Sensor Wafer', 'Laser Indicator LED'],
      targetHOI: 'AstronautHand slides Tray into OCT Chamber Drawer',
      requiredTools: ['OCT Drawer Lever'],
      rackRelativeCoords: { x: 0.32, y: 0.35, z: 0.15 },
      safetyWarning: 'Class 3R laser active inside chamber. Avoid direct line-of-sight during tray locking.',
      nominalDurationSec: 75,
      prerequisiteStepIds: ['step-centrifuge-cycle'],
    },
    {
      stepNumber: 6,
      id: 'step-waste-stow',
      name: 'Hazardous Waste Neutralization & Glovebox Stow',
      description: 'Eject contaminated micropipette tips into Bio-Hazard waste receptacle and log barcoded canister serial.',
      expectedObjects: ['Bio-Hazard Receptacle', 'Barcode Scanner Handset', 'Contaminated Tips'],
      targetHOI: 'AstronautHand deposits Tips into Bio-Hazard Receptacle',
      requiredTools: ['Bio-Waste Canister 4B'],
      rackRelativeCoords: { x: 0.4, y: -0.35, z: 0.3 },
      safetyWarning: 'Seal receptacle door firmly until audible magnetic lock engagement.',
      nominalDurationSec: 45,
      prerequisiteStepIds: ['step-spectrometer-scan'],
    },
  ],
};

export default function App() {
  const [experiments, setExperiments] = useState<ExperimentProtocol[]>([INITIAL_EXPERIMENT]);
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentProtocol>(INITIAL_EXPERIMENT);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepVerificationStatus>>({
    'step-rack-init': 'IN_PROGRESS',
  });

  const [activeView, setActiveView] = useState<'monitor' | 'sequence' | 'stream' | 'telemetry' | 'model'>('monitor');
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(true);
  const [currentPose, setCurrentPose] = useState<HMRPose | undefined>();
  const [currentHOI, setCurrentHOI] = useState<any>(null);

  // Anomaly Modal State
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState<boolean>(false);
  const [anomalyTitle, setAnomalyTitle] = useState<string>('');
  const [anomalyMessage, setAnomalyMessage] = useState<string>('');
  const [voiceAlertText, setVoiceAlertText] = useState<string>('');
  const [hasActiveAnomaly, setHasActiveAnomaly] = useState<boolean>(false);

  // Gemini loading state
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);

  // Telemetry logs
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([
    {
      id: 'TEL-INIT-01',
      timestamp: new Date(Date.now() - 360000).toISOString(),
      metSeconds: 310,
      experimentId: INITIAL_EXPERIMENT.id,
      stepId: 'step-rack-init',
      stepNumber: 1,
      stepName: 'Rack Safety & Airlock Chamber Sanitization',
      actionDetected: 'Engaged HEPA differential purge dial to 100%',
      status: 'VERIFIED',
      confidence: 0.98,
      rackCoordinates: { x: -0.25, y: 0.4, z: 0.3, pitchDeg: 16.2, rollDeg: -8.4, yawDeg: 4.1 },
      handObjectInteraction: { hand: 'Right', targetObject: 'HEPA Purge Dial', action: 'Rotates', distanceMeters: 0.03, contactState: 'Manipulating' },
      edgeLatencyMs: 14.1,
    },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch experiments on mount
  useEffect(() => {
    fetch('/api/experiments')
      .then((res) => res.json())
      .then((data) => {
        if (data.experiments && data.experiments.length > 0) {
          setExperiments(data.experiments);
          setCurrentExperiment(data.experiments[0]);
        }
      })
      .catch((err) => console.log('Using local protocols:', err));
  }, []);

  const currentStep = currentExperiment.steps[currentStepIndex] || currentExperiment.steps[0];
  const suggestedNextStep = currentExperiment.steps[currentStepIndex + 1];

  // Helper to log telemetry
  const recordTelemetryEntry = (
    step: ExperimentStep,
    status: StepVerificationStatus,
    actionDesc: string,
    anomalyInfo?: string
  ) => {
    const entry: TelemetryLogEntry = {
      id: `TEL-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      metSeconds: Math.floor((Date.now() - 1700000000000) / 1000) % 86400,
      experimentId: currentExperiment.id,
      stepId: step.id,
      stepNumber: step.stepNumber,
      stepName: step.name,
      actionDetected: actionDesc,
      status,
      confidence: status === 'VERIFIED' ? 0.96 : 0.88,
      rackCoordinates: {
        x: currentStep.rackRelativeCoords.x,
        y: currentStep.rackRelativeCoords.y,
        z: currentStep.rackRelativeCoords.z,
        pitchDeg: currentPose?.rackOrientation.pitchDeg || 18,
        rollDeg: currentPose?.rackOrientation.rollDeg || -12,
        yawDeg: currentPose?.rackOrientation.yawDeg || 6,
      },
      handObjectInteraction: {
        hand: 'Right',
        targetObject: step.expectedObjects[0] || 'Scientific Instrument',
        action: step.targetHOI,
        distanceMeters: currentHOI?.distanceMeters || 0.04,
        contactState: currentHOI?.contactState || 'Manipulating',
      },
      anomalyDetails: anomalyInfo,
      edgeLatencyMs: Number((13.5 + Math.random() * 2).toFixed(1)),
    };

    setTelemetryLogs((prev) => [entry, ...prev]);

    // Send to backend buffer
    fetch('/api/telemetry/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch((e) => console.warn('Telemetry log post failed:', e));
  };

  // 1. Verify & Advance Step (Prompt Requirement: At the start or after each step, the model should suggest the next step to be performed)
  const handleVerifyStep = (stepIdx: number) => {
    const step = currentExperiment.steps[stepIdx];
    if (!step) return;

    setStepStatuses((prev) => ({
      ...prev,
      [step.id]: 'VERIFIED',
    }));

    setHasActiveAnomaly(false);

    recordTelemetryEntry(
      step,
      'VERIFIED',
      `Completed ${step.name} nominally.`
    );

    playAvionicsAlertChime('SUCCESS');

    // Advance to next step if exists
    if (stepIdx < currentExperiment.steps.length - 1) {
      const nextIdx = stepIdx + 1;
      const next = currentExperiment.steps[nextIdx];
      setCurrentStepIndex(nextIdx);
      setStepStatuses((prev) => ({
        ...prev,
        [next.id]: 'IN_PROGRESS',
      }));

      // Speak next step suggestion
      const announcement = `Step ${step.stepNumber} verified. Next suggested operation: Step ${next.stepNumber}, ${next.name}.`;
      speakVoiceAlert(announcement, { mute: !voiceAlertsEnabled });
    } else {
      speakVoiceAlert('Experiment completed successfully. All steps verified.', { mute: !voiceAlertsEnabled });
    }
  };

  // 2. Simulate & Handle Sequence Anomalies (Prompt Requirement: It should alert when a step is skipped or an out of sequence step is added. It should be a voice based alert.)
  const handleSimulateAnomaly = (type: 'SKIPPED_STEP' | 'OUT_OF_SEQUENCE' | 'TOOL_MISMATCH') => {
    setHasActiveAnomaly(true);

    if (type === 'SKIPPED_STEP') {
      const skippedStep = currentExperiment.steps[currentStepIndex];
      const targetSkipped = currentExperiment.steps[currentStepIndex + 2] || currentExperiment.steps[currentExperiment.steps.length - 1];

      setStepStatuses((prev) => ({
        ...prev,
        [skippedStep.id]: 'SKIPPED',
        [targetSkipped.id]: 'OUT_OF_SEQUENCE',
      }));

      const alertTitle = `Protocol Violation: Step ${skippedStep.stepNumber} Was Skipped!`;
      const alertMsg = `Astronaut initiated "${targetSkipped.name}" without executing mandatory predecessor Step ${skippedStep.stepNumber}: "${skippedStep.name}". This risks sample contamination and protocol failure.`;
      const voice = `Warning! Sequence anomaly detected. Step ${skippedStep.stepNumber}, ${skippedStep.name}, was skipped. You must complete step ${skippedStep.stepNumber} before proceeding.`;

      setAnomalyTitle(alertTitle);
      setAnomalyMessage(alertMsg);
      setVoiceAlertText(voice);
      setIsAnomalyModalOpen(true);

      speakVoiceAlert(voice, { mute: !voiceAlertsEnabled });

      recordTelemetryEntry(
        skippedStep,
        'SKIPPED',
        `Anomaly: Step ${skippedStep.stepNumber} skipped in favor of Step ${targetSkipped.stepNumber}`,
        alertMsg
      );
    } else if (type === 'OUT_OF_SEQUENCE') {
      const step = currentExperiment.steps[currentStepIndex];
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: 'OUT_OF_SEQUENCE',
      }));

      const alertTitle = `Out-of-Sequence Operation Detected`;
      const alertMsg = `Action detected deviates from nominal state transition graph. Current phase requires "${step.targetHOI}", but unauthorized action was attempted.`;
      const voice = `Caution! Out of sequence operation detected on payload rack. Verify protocol checklist before proceeding.`;

      setAnomalyTitle(alertTitle);
      setAnomalyMessage(alertMsg);
      setVoiceAlertText(voice);
      setIsAnomalyModalOpen(true);

      speakVoiceAlert(voice, { mute: !voiceAlertsEnabled });

      recordTelemetryEntry(
        step,
        'OUT_OF_SEQUENCE',
        `Deviation: Out-of-sequence hand interaction detected on ${step.name}`,
        alertMsg
      );
    }
  };

  // 3. Gemini Multimodal Deep Analysis
  const handleTriggerGeminiAnalysis = async () => {
    setIsGeminiLoading(true);
    let capturedImage = '';
    if (canvasRef.current) {
      capturedImage = canvasRef.current.toDataURL('image/jpeg', 0.85);
    }

    try {
      const res = await fetch('/api/gemini/analyze-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
          currentStep,
          detectedObjects: currentStep.expectedObjects,
          rackOrientation: currentPose?.rackOrientation,
          experimentId: currentExperiment.id,
          userQuery: 'Analyze astronaut hand-object interaction and verify posture relative to payload rack',
        }),
      });

      const result = await res.json();
      if (result.voiceAlertText && voiceAlertsEnabled) {
        speakVoiceAlert(result.voiceAlertText);
      }

      // Display analysis in modal if deviation or nominal confirmation
      setAnomalyTitle(result.status === 'NOMINAL' ? 'AI SOP Verification: Passed' : 'AI SOP Inspection Alert');
      setAnomalyMessage(result.analysis || 'Step posture aligned with microgravity protocol.');
      setVoiceAlertText(result.voiceAlertText || 'Posture verified.');
      setIsAnomalyModalOpen(true);
    } catch (err: any) {
      console.warn('Gemini analysis failed:', err);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Flight Avionics Top Header */}
      <Header
        currentExperiment={currentExperiment}
        experiments={experiments}
        onSelectExperiment={(exp) => {
          setCurrentExperiment(exp);
          setCurrentStepIndex(0);
          setStepStatuses({ [exp.steps[0].id]: 'IN_PROGRESS' });
          setHasActiveAnomaly(false);
        }}
        voiceAlertsEnabled={voiceAlertsEnabled}
        onToggleVoiceAlerts={() => {
          setVoiceAlertsEnabled(!voiceAlertsEnabled);
          if (!voiceAlertsEnabled) {
            speakVoiceAlert('Voice alerts enabled.', { mute: false });
          }
        }}
        anomaliesCount={hasActiveAnomaly ? 1 : 0}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {activeView === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (7 cols): Live Camera Feed with 33-point BlazePose & Cockpit Avionics */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <LiveCameraFeed
                currentExperiment={currentExperiment}
                currentStep={currentStep}
                suggestedNextStep={suggestedNextStep}
                currentStepIndex={currentStepIndex}
                onVerifyStep={handleVerifyStep}
                voiceAlertsEnabled={voiceAlertsEnabled}
                onPoseUpdate={setCurrentPose}
                onHOIUpdate={setCurrentHOI}
                hasAnomaly={hasActiveAnomaly}
                canvasRefOut={canvasRef}
              />
            </div>

            {/* Right Column (5 cols): Side Display (Astronaut Live 3D Movement + AI Step Suggestion Engine) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Astronaut Live Movement in Side Display */}
              <RackOrientation3D
                pose={currentPose}
                rackId={currentExperiment.payloadRackId}
                currentStep={currentStep}
                currentHOI={currentHOI}
              />

              <StepSuggestionHUD
                currentExperiment={currentExperiment}
                currentStepIndex={currentStepIndex}
                stepStatuses={stepStatuses}
                onVerifyStep={handleVerifyStep}
                onSimulateAnomaly={handleSimulateAnomaly}
                onSelectStepIndex={(idx) => {
                  setCurrentStepIndex(idx);
                  setHasActiveAnomaly(false);
                }}
                voiceAlertsEnabled={voiceAlertsEnabled}
                onTriggerGeminiAnalysis={handleTriggerGeminiAnalysis}
                isGeminiLoading={isGeminiLoading}
              />
            </div>
          </div>
        )}

        {activeView === 'sequence' && (
          <SequenceGraphView
            currentExperiment={currentExperiment}
            currentStepIndex={currentStepIndex}
            stepStatuses={stepStatuses}
            onSelectStepIndex={setCurrentStepIndex}
          />
        )}

        {activeView === 'stream' && (
          <StreamAndStoragePanel canvasElement={canvasRef.current} />
        )}

        {activeView === 'telemetry' && (
          <TelemetryLogViewer
            logs={telemetryLogs}
            onClearLogs={() => setTelemetryLogs([])}
            experimentName={currentExperiment.name}
          />
        )}

        {activeView === 'model' && (
          <DatasetAndModelDeliverable currentExperiment={currentExperiment} />
        )}
      </main>

      {/* Anomaly & Voice Alert Modal */}
      <AnomalyAlertModal
        isOpen={isAnomalyModalOpen}
        anomalyTitle={anomalyTitle}
        anomalyMessage={anomalyMessage}
        voiceText={voiceAlertText}
        voiceAlertsEnabled={voiceAlertsEnabled}
        onDismiss={() => setIsAnomalyModalOpen(false)}
        onAutoCorrect={() => {
          setHasActiveAnomaly(false);
          setStepStatuses({
            [currentStep.id]: 'IN_PROGRESS',
          });
        }}
      />
    </div>
  );
}
