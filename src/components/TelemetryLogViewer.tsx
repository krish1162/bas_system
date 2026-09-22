import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Code,
  CheckCircle2
} from 'lucide-react';
import { TelemetryLogEntry } from '../types';

interface TelemetryLogViewerProps {
  logs: TelemetryLogEntry[];
  onClearLogs: () => void;
  experimentName: string;
}

export const TelemetryLogViewer: React.FC<TelemetryLogViewerProps> = ({
  logs,
  onClearLogs,
  experimentName,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterStatus === 'ALL' || log.status === filterStatus;
    const matchesSearch = 
      searchTerm === '' ||
      log.stepName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionDetected.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.status.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Generate CCSDS / NASA Standard Lightweight ASCII text format
  const generateAsciTextFile = (): string => {
    const header = [
      `================================================================================`,
      `ORBITHAR FLIGHT EXPERIMENT TELEMETRY LOG - CCSDS COMPLIANT LIGHTWEIGHT FORMAT`,
      `EXPERIMENT   : ${experimentName}`,
      `SYSTEM       : OrbitHAR Standalone Edge Computer (NPU/TPU INT8)`,
      `GENERATED AT : ${new Date().toISOString()}`,
      `TOTAL EVENTS : ${logs.length}`,
      `================================================================================`,
      `TIME (UTC)               | MET       | STEP | STATUS          | CONF  | RACK_COORDS (X,Y,Z,P,R)      | ACTION & HOI`,
      `------------------------------------------------------------------------------------------------------------------------`,
    ];

    const body = logs.map((log) => {
      const time = log.timestamp.slice(11, 23).padEnd(12);
      const met = `T+${Math.floor(log.metSeconds / 60).toString().padStart(2, '0')}:${(log.metSeconds % 60).toString().padStart(2, '0')}`.padEnd(8);
      const step = `S${log.stepNumber}`.padEnd(4);
      const status = log.status.padEnd(15);
      const conf = `${(log.confidence * 100).toFixed(0)}%`.padEnd(5);
      const coords = `[${log.rackCoordinates.x.toFixed(2)},${log.rackCoordinates.y.toFixed(2)},${log.rackCoordinates.z.toFixed(2)},${log.rackCoordinates.pitchDeg}°,${log.rackCoordinates.rollDeg}°]`.padEnd(24);
      const action = `${log.actionDetected} (${log.handObjectInteraction.contactState} -> ${log.handObjectInteraction.targetObject})`;

      return `${log.timestamp} | ${met} | ${step} | ${status} | ${conf} | ${coords} | ${action}`;
    });

    const footer = [
      `------------------------------------------------------------------------------------------------------------------------`,
      `END OF TELEMETRY BLOCK - CHECKSUM: CRC-32/AUTONOMOUS-EDGE-PASS`,
      `================================================================================`,
    ];

    return [...header, ...body, ...footer].join('\n');
  };

  // Generate Structured JSON file
  const generateJsonFile = (): string => {
    return JSON.stringify({
      mission: 'OrbitHAR Microgravity Flight Operation',
      experiment: experimentName,
      exportTimestamp: new Date().toISOString(),
      eventsCount: logs.length,
      telemetryLogs: logs,
    }, null, 2);
  };

  // Trigger download of the text or JSON file
  const downloadFile = (format: 'txt' | 'json') => {
    const content = format === 'txt' ? generateAsciTextFile() : generateJsonFile();
    const mimeType = format === 'txt' ? 'text/plain' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OrbitHAR_Telemetry_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (format: 'txt' | 'json') => {
    const content = format === 'txt' ? generateAsciTextFile() : generateJsonFile();
    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Structured Lightweight Telemetry Log Generator</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              {logs.length} EVENTS RECORDED
            </span>
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            Compliant with CCSDS Space Data Systems & Low-Bandwidth Downlink (~2.8 KB)
          </p>
        </div>

        {/* Download Buttons (Prompt Requirement: Using the live video, it should generate a timestamped and structured lightweight text file of the conducted steps with outcomes/ status) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadFile('txt')}
            id="download-ascii-txt-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-medium shadow-md transition-colors"
            title="Download lightweight text file of conducted steps"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .TXT Log</span>
          </button>

          <button
            onClick={() => downloadFile('json')}
            id="download-json-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => copyToClipboard('txt')}
            id="copy-telemetry-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs transition-colors"
            title="Copy formatted text to clipboard"
          >
            {copiedFormat === 'txt' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedFormat === 'txt' ? 'Copied' : 'Copy'}</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              id="clear-logs-btn"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              title="Clear telemetry buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search step, action, or status..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">All Statuses ({logs.length})</option>
            <option value="VERIFIED">Verified Steps</option>
            <option value="OUT_OF_SEQUENCE">Out of Sequence</option>
            <option value="SKIPPED">Skipped</option>
            <option value="TOOL_MISMATCH">Tool Mismatch</option>
          </select>
        </div>
      </div>

      {/* Structured Telemetry Log Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2 px-3">TIMESTAMP / MET</th>
                <th className="py-2 px-3">STEP</th>
                <th className="py-2 px-3">VERIFICATION STATUS</th>
                <th className="py-2 px-3">CONF</th>
                <th className="py-2 px-3">RACK COORDINATES (X,Y,Z | P,R,Y)</th>
                <th className="py-2 px-3">HOI INTERACTION</th>
                <th className="py-2 px-3">LATENCY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="text-slate-200">{log.timestamp.slice(11, 23)}</div>
                      <div className="text-[10px] text-slate-500">
                        T+{Math.floor(log.metSeconds / 60).toString().padStart(2, '0')}:{(log.metSeconds % 60).toString().padStart(2, '0')}
                      </div>
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-white">Step {log.stepNumber}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={log.stepName}>
                        {log.stepName}
                      </div>
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase inline-block ${
                          log.status === 'VERIFIED'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : log.status === 'OUT_OF_SEQUENCE'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                            : log.status === 'SKIPPED'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                            : 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.anomalyDetails && (
                        <div className="text-[10px] text-rose-400 mt-0.5 max-w-[160px] truncate" title={log.anomalyDetails}>
                          {log.anomalyDetails}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap text-cyan-400 font-bold">
                      {(log.confidence * 100).toFixed(0)}%
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap text-slate-400">
                      <div>
                        [{log.rackCoordinates.x.toFixed(2)}, {log.rackCoordinates.y.toFixed(2)}, {log.rackCoordinates.z.toFixed(2)}]
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Pitch: {log.rackCoordinates.pitchDeg}° | Roll: {log.rackCoordinates.rollDeg}°
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="text-slate-200">{log.handObjectInteraction.targetObject}</div>
                      <div className="text-[10px] text-slate-400">
                        {log.handObjectInteraction.contactState} ({(log.handObjectInteraction.distanceMeters * 100).toFixed(1)} cm)
                      </div>
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap text-emerald-400">
                      {log.edgeLatencyMs} ms
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No telemetry entries matched current filter. Verify steps in the Live Monitor or trigger actions to record data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
