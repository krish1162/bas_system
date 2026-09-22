import React from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Circle, 
  Clock, 
  Wrench, 
  Target,
  ShieldCheck
} from 'lucide-react';
import { ExperimentProtocol, StepVerificationStatus } from '../types';

interface SequenceGraphViewProps {
  currentExperiment: ExperimentProtocol;
  currentStepIndex: number;
  stepStatuses: Record<string, StepVerificationStatus>;
  onSelectStepIndex: (index: number) => void;
}

export const SequenceGraphView: React.FC<SequenceGraphViewProps> = ({
  currentExperiment,
  currentStepIndex,
  stepStatuses,
  onSelectStepIndex,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            <span>Pre-defined Experiment Sequence State Machine & Transition Graph</span>
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Strict Markov sequence validation ensures scientific protocol integrity without real-time Earth intervention.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Nominal Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
            <span>Active Step</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Out of Sequence</span>
          </div>
        </div>
      </div>

      {/* Sequence Graph Node Chain */}
      <div className="space-y-3">
        {currentExperiment.steps.map((step, idx) => {
          const status = stepStatuses[step.id] || (idx === currentStepIndex ? 'IN_PROGRESS' : 'PENDING');
          const isCurrent = idx === currentStepIndex;
          const isVerified = status === 'VERIFIED';
          const isDeviated = status === 'OUT_OF_SEQUENCE' || status === 'SKIPPED';

          return (
            <div key={step.id} className="relative">
              {/* Connector line to next node */}
              {idx < currentExperiment.steps.length - 1 && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-7 z-0 transition-colors ${
                    isVerified
                      ? 'bg-emerald-500/80'
                      : isCurrent
                      ? 'bg-gradient-to-b from-cyan-500 to-slate-700'
                      : 'bg-slate-800'
                  }`}
                />
              )}

              <div
                onClick={() => onSelectStepIndex(idx)}
                className={`relative z-10 p-3.5 rounded-xl border transition-all cursor-pointer flex flex-wrap items-start justify-between gap-3 ${
                  isCurrent
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-950/40'
                    : isVerified
                    ? 'bg-slate-950/80 border-emerald-900/60 text-slate-200 hover:border-emerald-700'
                    : isDeviated
                    ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Step Sequence Badge */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                      isVerified
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : isCurrent
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900'
                        : isDeviated
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {isVerified ? '✓' : `S${step.stepNumber}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{step.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        ~{step.nominalDurationSec}s
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                      {step.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Wrench className="w-3 h-3 text-amber-400" />
                        <span>Tools: {step.requiredTools.join(', ')}</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-300">
                        <Target className="w-3 h-3 text-emerald-400" />
                        <span>HOI: {step.targetHOI}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-right shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
                      isVerified
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : isCurrent
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-600 animate-pulse'
                        : isDeviated
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
