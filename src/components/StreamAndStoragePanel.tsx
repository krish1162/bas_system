import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  HardDrive, 
  Play, 
  Square, 
  Download, 
  Server, 
  Wifi, 
  Activity, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  Clock
} from 'lucide-react';
import { StreamConfig, LocalStorageStatus } from '../types';

interface StreamAndStoragePanelProps {
  canvasElement?: HTMLCanvasElement | null;
}

export const StreamAndStoragePanel: React.FC<StreamAndStoragePanelProps> = ({
  canvasElement,
}) => {
  // IP Stream Configuration
  const [streamConfig, setStreamConfig] = useState<StreamConfig>({
    enabled: true,
    targetIp: '10.240.0.12',
    targetPort: 8554,
    protocol: 'RTSP',
    bitrateKbps: 2500,
    resolution: '960x540',
    fps: 30,
    bytesTransmitted: 14820000,
    packetsSent: 9420,
    packetsDropped: 4,
    simulatedRttMs: 14.8,
  });

  // Local Storage & MediaRecorder
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDurationSec, setRecordDurationSec] = useState<number>(0);
  const [recordedClips, setRecordedClips] = useState<Array<{ id: string; url: string; sizeMb: number; duration: number; timestamp: string }>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  // Simulated streaming packet transmission ticker
  useEffect(() => {
    if (!streamConfig.enabled) return;

    const interval = setInterval(() => {
      setStreamConfig(prev => {
        const addedBytes = Math.round((prev.bitrateKbps * 1000) / 8 / 2); // 0.5s chunks
        const addedPackets = Math.round(addedBytes / 1400);
        const randomDrop = Math.random() < 0.05 ? 1 : 0;
        return {
          ...prev,
          bytesTransmitted: prev.bytesTransmitted + addedBytes,
          packetsSent: prev.packetsSent + addedPackets,
          packetsDropped: prev.packetsDropped + randomDrop,
          simulatedRttMs: Number((14.0 + Math.random() * 2.5).toFixed(1)),
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [streamConfig.enabled, streamConfig.bitrateKbps]);

  // Start local video recording using real MediaRecorder on canvas stream
  const startRecording = () => {
    if (!canvasElement) {
      alert('Canvas stream not initialized. Please ensure camera feed is running.');
      return;
    }

    try {
      const stream = canvasElement.captureStream(30);
      recordedChunksRef.current = [];

      // Determine supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const sizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));
        const newClip = {
          id: `CLIP-${Date.now().toString().slice(-6)}`,
          url,
          sizeMb: sizeMb > 0 ? sizeMb : 1.45,
          duration: recordDurationSec || 5,
          timestamp: new Date().toLocaleTimeString(),
        };
        setRecordedClips(prev => [newClip, ...prev]);
        setRecordDurationSec(0);
      };

      recorder.start(1000); // 1s slices
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDurationSec(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordDurationSec(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('MediaRecorder start failed:', err);
      // Fallback simulated recording
      setIsRecording(true);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordDurationSec(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback
      const newClip = {
        id: `CLIP-${Date.now().toString().slice(-6)}`,
        url: '#',
        sizeMb: Number((recordDurationSec * 0.45).toFixed(2)),
        duration: recordDurationSec,
        timestamp: new Date().toLocaleTimeString(),
      };
      setRecordedClips(prev => [newClip, ...prev]);
      setRecordDurationSec(0);
    }

    setIsRecording(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Video Streaming to Specific IP */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Target IP Video Streamer</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    streamConfig.enabled
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {streamConfig.enabled ? 'TRANSMITTING' : 'IDLE'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  RTSP / RTP H.264 Spacecraft Downlink Relay
                </p>
              </div>
            </div>

            <button
              onClick={() => setStreamConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              id="toggle-ip-stream-btn"
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                streamConfig.enabled
                  ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {streamConfig.enabled ? 'Stop Stream' : 'Start IP Stream'}
            </button>
          </div>

          {/* Configuration Form */}
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Target Destination IP:</label>
                <input
                  type="text"
                  value={streamConfig.targetIp}
                  onChange={(e) => setStreamConfig(prev => ({ ...prev, targetIp: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="10.240.0.12"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Port:</label>
                <input
                  type="number"
                  value={streamConfig.targetPort}
                  onChange={(e) => setStreamConfig(prev => ({ ...prev, targetPort: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="8554"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Protocol:</label>
                <select
                  value={streamConfig.protocol}
                  onChange={(e) => setStreamConfig(prev => ({ ...prev, protocol: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="RTSP">RTSP (Real Time Streaming)</option>
                  <option value="RTP/UDP">RTP/UDP Unicast</option>
                  <option value="WebRTC">WebRTC Low Latency</option>
                  <option value="SRT">SRT (Secure Reliable)</option>
                </select>
              </div>
            </div>

            {/* Bitrate Limiter */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Constrained Bandwidth Bitrate:</span>
                <span className="text-cyan-400 font-bold">{streamConfig.bitrateKbps} kbps</span>
              </div>
              <input
                type="range"
                min="500"
                max="8000"
                step="250"
                value={streamConfig.bitrateKbps}
                onChange={(e) => setStreamConfig(prev => ({ ...prev, bitrateKbps: Number(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>500 kbps (Deep Space)</span>
                <span>4000 kbps (Lunar Hab)</span>
                <span>8000 kbps (High Def)</span>
              </div>
            </div>

            {/* Live Stream Telemetry Grid */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <div className="text-slate-500">SENT DATA</div>
                <div className="text-white font-bold">
                  {(streamConfig.bytesTransmitted / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
              <div>
                <div className="text-slate-500">PACKETS</div>
                <div className="text-cyan-400 font-bold">{streamConfig.packetsSent.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500">PACKET LOSS</div>
                <div className="text-emerald-400 font-bold">
                  {((streamConfig.packetsDropped / (streamConfig.packetsSent || 1)) * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-slate-500">LINK RTT</div>
                <div className="text-amber-400 font-bold">{streamConfig.simulatedRttMs} ms</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>Active URI:</span>
          <span className="text-cyan-300 truncate max-w-xs">
            {streamConfig.protocol.toLowerCase()}://{streamConfig.targetIp}:{streamConfig.targetPort}/live/rack-cam01
          </span>
        </div>
      </div>

      {/* 2. Local Video Recording & Storage */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Local Experiment Video Storage</span>
                  {isRecording && (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      REC [{recordDurationSec}s]
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Autonomous On-Board NVMe Flash Cache
                </p>
              </div>
            </div>

            {/* Record / Stop Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                id="start-record-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold shadow-md transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>Record Clip</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                id="stop-record-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold shadow-md transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Save</span>
              </button>
            )}
          </div>

          {/* Local Disk Telemetry Bar */}
          <div className="space-y-3 font-mono text-xs mb-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Edge Storage Allocation (High-Speed NVMe):</span>
                <span className="text-slate-300">4.2 GB / 64.0 GB (6.5%)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 w-[6.5%]" />
              </div>
            </div>

            {/* Saved Clips List */}
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2">
                <span>Recent Locally Stored Clips:</span>
                <span>{recordedClips.length} Clips Available</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recordedClips.length > 0 ? (
                  recordedClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <FileVideo className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">{clip.id}.webm</div>
                          <div className="text-[10px] text-slate-500">
                            {clip.timestamp} • {clip.duration}s • {clip.sizeMb} MB
                          </div>
                        </div>
                      </div>

                      {clip.url !== '#' && (
                        <a
                          href={clip.url}
                          download={`OrbitHAR_${clip.id}.webm`}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors"
                          title="Download recorded video to local device"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 text-center text-slate-500 text-xs">
                    No clips saved yet. Click "Record Clip" above to record the live payload feed directly into on-board storage.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>Zero Bandwidth Mode:</span>
          <span className="text-emerald-400">100% Offline Edge Persistence</span>
        </div>
      </div>
    </div>
  );
};
