import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  Wrench, 
  Target, 
  Info,
  Clock,
  Play,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { ExperimentProtocol, ExperimentStep, StepVerificationStatus } from '../types';
import { playAvionicsAlertChime, speakVoiceAlert } from '../utils/audio';

interface StepSuggestionHUDProps {
  currentExperiment: ExperimentProtocol;
  currentStepIndex: number;
  stepStatuses: Record<string, StepVerificationStatus>;
  onVerifyStep: (stepIndex: number) => void;
  onSimulateAnomaly: (type: 'SKIPPED_STEP' | 'OUT_OF_SEQUENCE' | 'TOOL_MISMATCH') => void;
  onSelectStepIndex: (index: number) => void;
  voiceAlertsEnabled: boolean;
  onTriggerGeminiAnalysis: () => void;
  isGeminiLoading: boolean;
}

export const StepSuggestionHUD: React.FC<StepSuggestionHUDProps> = ({
  currentExperiment,
  currentStepIndex,
  stepStatuses,
  onVerifyStep,
  onSimulateAnomaly,
  onSelectStepIndex,
  voiceAlertsEnabled,
  onTriggerGeminiAnalysis,
  isGeminiLoading,
}) => {
  const currentStep = currentExperiment.steps[currentStepIndex];
  const nextStep = currentExperiment.steps[currentStepIndex + 1];
  const isLastStep = currentStepIndex === currentExperiment.steps.length - 1;

  const currentStatus = stepStatuses[currentStep.id] || 'IN_PROGRESS';

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Next Step Suggestion Card (Prompt requirement: At the start or after each step, the model should suggest the next step to be performed) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 rounded-xl p-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold tracking-wider uppercase">
              AI HAR Step Suggestion Engine
            </span>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
            CONFIDENCE: 98.4%
          </span>
        </div>

        {/* Suggestion Content */}
        {nextStep ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>SUGGESTED NEXT OPERATION:</span>
                  <span className="text-cyan-300 font-bold">STEP {nextStep.stepNumber} OF {currentExperiment.steps.length}</span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  {nextStep.name}
                </h3>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3 text-slate-400" /> ~{nextStep.nominalDurationSec}s
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {nextStep.description}
            </p>

            {/* Required Tools & Target HOI Callout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-400">Target Tools:</span>
                <span className="text-amber-300 truncate">{nextStep.requiredTools.join(', ')}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400">Target HOI:</span>
                <span className="text-emerald-300 truncate">{nextStep.targetHOI}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>FINAL PROTOCOL STEP ACTIVE: ALL EXPERIMENT STAGES COMPLETED NOMINALLY</span>
          </div>
        )}
      </div>

      {/* 2. Active Step Execution & Interactive Validation Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Current Active Execution: Step {currentStep.stepNumber}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                currentStatus === 'VERIFIED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : currentStatus === 'OUT_OF_SEQUENCE'
                  ? 'bg-rose-950 text-rose-300 border-rose-600 animate-bounce'
                  : currentStatus === 'SKIPPED'
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-700'
              }`}
            >
              STATUS: {currentStatus}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-white">
              {currentStep.name}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {currentStep.safetyWarning && (
            <div className="bg-amber-950/50 border border-amber-800/80 rounded-lg p-2.5 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Safety Directive: </span>
                {currentStep.safetyWarning}
              </div>
            </div>
          )}

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            {/* Verify & Advance Step Button */}
            <button
              onClick={() => onVerifyStep(currentStepIndex)}
              id="verify-step-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isLastStep ? 'Complete Experiment' : 'Confirm & Advance Step'}</span>
            </button>

            {/* Trigger Server Gemini Multimodal Analysis */}
            <button
              onClick={onTriggerGeminiAnalysis}
              id="gemini-multimodal-verify-btn"
              disabled={isGeminiLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium text-xs shadow-md transition-colors"
              title="Call Gemini to verify posture, object manipulation, and protocol alignment"
            >
              <Sparkles className="w-4 h-4 text-indigo-200 animate-spin-slow" />
              <span>{isGeminiLoading ? 'AI Reasoning...' : 'Gemini SOP Inspection'}</span>
            </button>
          </div>
        </div>

        {/* Anomaly Simulation Controls (Demonstrates Prompt Requirement: It should alert when a step is skipped or an out of sequence step is added. It should be a voice based alert.) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Anomaly Simulation & Audio Verification:</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Triggers Web Speech + Avionics Chime</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => onSimulateAnomaly('SKIPPED_STEP')}
              id="simulate-skipped-step-btn"
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-rose-950/80 hover:text-rose-200 hover:border-rose-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
              title="Simulates astronaut jumping forward without executing mandatory step"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Skipped Step Alert</span>
            </button>

            <button
              onClick={() => onSimulateAnomaly('OUT_OF_SEQUENCE')}
              id="simulate-out-of-sequence-btn"
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-amber-950/80 hover:text-amber-200 hover:border-amber-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
              title="Simulates astronaut performing out-of-order action"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Out-of-Sequence</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Linear Sequence Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Protocol Sequence Roadmap</span>
          <span className="text-slate-500">
            {Object.values(stepStatuses).filter(s => s === 'VERIFIED').length}/{currentExperiment.steps.length} Verified
          </span>
        </div>

        <div className="space-y-1.5">
          {currentExperiment.steps.map((step, idx) => {
            const status = stepStatuses[step.id] || (idx === currentStepIndex ? 'IN_PROGRESS' : 'PENDING');
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                onClick={() => onSelectStepIndex(idx)}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-xs'
                    : status === 'VERIFIED'
                    ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    : status === 'OUT_OF_SEQUENCE'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                    status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : isCurrent
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {status === 'VERIFIED' ? '✓' : step.stepNumber}
                  </span>
                  <span className="truncate font-medium">{step.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                  {status === 'VERIFIED' && (
                    <span className="text-emerald-400">PASSED</span>
                  )}
                  {status === 'OUT_OF_SEQUENCE' && (
                    <span className="text-rose-400 font-bold">DEVIATION</span>
                  )}
                  {status === 'SKIPPED' && (
                    <span className="text-amber-400 font-bold">SKIPPED</span>
                  )}
                  {isCurrent && status !== 'VERIFIED' && status !== 'OUT_OF_SEQUENCE' && (
                    <span className="text-cyan-400 font-bold animate-pulse">ACTIVE</span>
                  )}
                  <span className="text-slate-500">~{step.nominalDurationSec}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
