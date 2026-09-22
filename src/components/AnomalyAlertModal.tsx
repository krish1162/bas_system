import React from 'react';
import { AlertTriangle, Volume2, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { speakVoiceAlert } from '../utils/audio';

interface AnomalyAlertModalProps {
  isOpen: boolean;
  anomalyTitle: string;
  anomalyMessage: string;
  voiceText: string;
  voiceAlertsEnabled: boolean;
  onDismiss: () => void;
  onAutoCorrect?: () => void;
}

export const AnomalyAlertModal: React.FC<AnomalyAlertModalProps> = ({
  isOpen,
  anomalyTitle,
  anomalyMessage,
  voiceText,
  voiceAlertsEnabled,
  onDismiss,
  onAutoCorrect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-500 rounded-xl max-w-lg w-full p-5 shadow-2xl shadow-rose-950/60 relative overflow-hidden font-mono">
        {/* Top Warning Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        <div className="flex items-start gap-3">
          <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-rose-400 shrink-0 animate-bounce">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                Autonomous HAR Flight Anomaly Alert
              </span>
              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white mt-1">
              {anomalyTitle}
            </h3>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
              {anomalyMessage}
            </p>

            {/* Voice Alert Replay */}
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                Voice Alert: <span className="text-emerald-400">{voiceAlertsEnabled ? 'Announced' : 'Muted in settings'}</span>
              </div>

              <button
                onClick={() => speakVoiceAlert(voiceText, { mute: false })}
                id="replay-voice-alert-btn"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay Voice Alert</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onDismiss}
                id="acknowledge-anomaly-btn"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Acknowledge Alert
              </button>

              {onAutoCorrect && (
                <button
                  onClick={() => {
                    onAutoCorrect();
                    onDismiss();
                  }}
                  id="corrective-action-btn"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  Apply Nominal Sequence Fix
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
