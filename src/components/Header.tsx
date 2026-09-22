import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  Satellite, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { ExperimentProtocol } from '../types';

interface HeaderProps {
  currentExperiment: ExperimentProtocol;
  experiments: ExperimentProtocol[];
  onSelectExperiment: (exp: ExperimentProtocol) => void;
  voiceAlertsEnabled: boolean;
  onToggleVoiceAlerts: () => void;
  anomaliesCount: number;
  activeView: 'monitor' | 'sequence' | 'stream' | 'telemetry' | 'model';
  onChangeView: (view: 'monitor' | 'sequence' | 'stream' | 'telemetry' | 'model') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentExperiment,
  experiments,
  onSelectExperiment,
  voiceAlertsEnabled,
  onToggleVoiceAlerts,
  anomaliesCount,
  activeView,
  onChangeView,
}) => {
  const [metSeconds, setMetSeconds] = useState<number>(372); // Mission Elapsed Time

  useEffect(() => {
    const timer = setInterval(() => {
      setMetSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatMET = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `T+${hrs}:${mins}:${secs}`;
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      {/* Top Telemetry Ticker */}
      <div className="bg-slate-900/90 px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="font-semibold tracking-wider">ORBIT-HAR v2.4</span>
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.2 rounded text-[10px]">
              EDGE STANDALONE
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5 text-slate-300">
            <Satellite className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">COMM LATENCY:</span>
            <span className="text-amber-400 font-bold">2.48s (LUNAR ORBIT)</span>
            <span className="text-slate-500">| AUTO-ASSIST ACTIVE</span>
          </div>

          <div className="h-3 w-px bg-slate-700 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">NPU/TPU:</span>
            <span className="text-emerald-400 font-semibold">14.2ms (70 FPS)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-1 sm:mt-0">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">MET:</span>
            <span className="text-sky-300 font-bold">{formatMET(metSeconds)}</span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          {/* Voice Alert Toggle */}
          <button
            onClick={onToggleVoiceAlerts}
            id="voice-alert-toggle-btn"
            title={voiceAlertsEnabled ? 'Voice Alerts Active' : 'Voice Alerts Muted'}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              voiceAlertsEnabled
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {voiceAlertsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">VOICE ALERT: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-medium">VOICE ALERT: MUTED</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Logo and Experiment Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30 border border-cyan-400/40">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                <span>OrbitHAR</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded">
                  {currentExperiment.payloadRackId}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Microgravity Experiment AI Copilot
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Experiment Protocol Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 hidden lg:inline">Protocol:</span>
            <select
              id="experiment-selector"
              value={currentExperiment.id}
              onChange={(e) => {
                const exp = experiments.find(x => x.id === e.target.value);
                if (exp) onSelectExperiment(exp);
              }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            >
              {experiments.map(exp => (
                <option key={exp.id} value={exp.id}>
                  {exp.name} ({exp.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onChangeView('monitor')}
            id="nav-tab-monitor"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'monitor'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Live HAR Monitor
          </button>
          <button
            onClick={() => onChangeView('sequence')}
            id="nav-tab-sequence"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'sequence'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Sequence Graph
          </button>
          <button
            onClick={() => onChangeView('stream')}
            id="nav-tab-stream"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'stream'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            IP Stream & Storage
          </button>
          <button
            onClick={() => onChangeView('telemetry')}
            id="nav-tab-telemetry"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'telemetry'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Telemetry Log
          </button>
          <button
            onClick={() => onChangeView('model')}
            id="nav-tab-model"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'model'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Dataset & Model
          </button>
        </nav>
      </div>
    </header>
  );
};
