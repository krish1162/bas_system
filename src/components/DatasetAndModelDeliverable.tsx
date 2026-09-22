import React, { useState } from 'react';
import { 
  Database, 
  Cpu, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Terminal, 
  HardDrive, 
  FileCode, 
  Sliders, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { ExperimentProtocol, SyntheticDataSample } from '../types';

interface DatasetAndModelDeliverableProps {
  currentExperiment: ExperimentProtocol;
}

export const DatasetAndModelDeliverable: React.FC<DatasetAndModelDeliverableProps> = ({
  currentExperiment,
}) => {
  const [activeTab, setActiveTab] = useState<'dataset' | 'model'>('dataset');
  const [numSamplesToGen, setNumSamplesToGen] = useState<number>(12);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSamples, setGeneratedSamples] = useState<SyntheticDataSample[]>([
    {
      sampleId: 'SYNTH-HAR-1001',
      stepLabel: 'Step 1: Rack Safety & HEPA Purge',
      astronautPose: { pitch: 18, roll: -12, yaw: 8 },
      objectsPresent: ['HEPA Purge Dial', 'Glovebox Chamber', 'Pressure Gauge'],
      hoiTriplet: '<Astronaut_Hand_Right, Rotates, HEPA_Purge_Dial>',
      bboxCount: 3,
      keypointsCount: 17,
      timestamp: '2026-09-21T00:04:12Z',
    },
    {
      sampleId: 'SYNTH-HAR-1002',
      stepLabel: 'Step 2: Retrieve Cryovials',
      astronautPose: { pitch: 35, roll: 22, yaw: -14 },
      objectsPresent: ['Cryo Tongs', 'Cryovial Alpha', 'Cryo-Rack Slot 03'],
      hoiTriplet: '<Astronaut_Hand_Left, Grasps, Cryo_Tongs>',
      bboxCount: 4,
      keypointsCount: 17,
      timestamp: '2026-09-21T00:04:15Z',
    },
    {
      sampleId: 'SYNTH-HAR-1003',
      stepLabel: 'Step 3: Micropipette Aspiration',
      astronautPose: { pitch: -25, roll: 45, yaw: 18 },
      objectsPresent: ['Micropipette P-20', 'Well Tray Plate', 'Vial Alpha'],
      hoiTriplet: '<Astronaut_Hand_Right, Aspirates, Well_Tray_Plate>',
      bboxCount: 4,
      keypointsCount: 17,
      timestamp: '2026-09-21T00:04:18Z',
    },
    {
      sampleId: 'SYNTH-HAR-1004',
      stepLabel: 'Step 4: Centrifuge Balance',
      astronautPose: { pitch: 70, roll: -60, yaw: 30 },
      objectsPresent: ['Centrifuge Rotor', 'Counterbalance Tube', 'Centrifuge Latch Lock'],
      hoiTriplet: '<Astronaut_Hand_Right, Inserts, Counterbalance_Tube>',
      bboxCount: 3,
      keypointsCount: 17,
      timestamp: '2026-09-21T00:04:22Z',
    },
  ]);

  // Generate synthetic dataset frames
  const handleGenerateSyntheticData = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-synthetic-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: currentExperiment.id,
          numSamples: numSamplesToGen,
        }),
      });
      const data = await res.json();
      if (data.samples || data.dataset) {
        const incoming = (data.samples || data.dataset).map((item: any, i: number) => ({
          sampleId: item.sampleId || `SYNTH-HAR-${2000 + i}`,
          stepLabel: item.label || currentExperiment.steps[i % currentExperiment.steps.length].name,
          astronautPose: item.rackPoseAngle || { pitch: (i * 25) % 90, roll: (i * 35) % 180, yaw: (i * 15) % 360 },
          objectsPresent: currentExperiment.steps[i % currentExperiment.steps.length].expectedObjects,
          hoiTriplet: item.annotatedHOI ? `<${item.annotatedHOI.subject}, ${item.annotatedHOI.verb}, ${item.annotatedHOI.object}>` : `<Astronaut_Hand, Manipulates, Target_Object>`,
          bboxCount: 3 + (i % 3),
          keypointsCount: 17,
          timestamp: new Date().toISOString(),
        }));
        setGeneratedSamples(prev => [...incoming, ...prev]);
      }
    } catch (err) {
      console.error('Synthetic generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDatasetJson = () => {
    const dataStr = JSON.stringify({
      datasetMetadata: {
        experiment: currentExperiment.name,
        payloadRack: currentExperiment.payloadRackId,
        annotationSchema: 'COCO-17 + 3D-HMR + HOI-Triplets',
        invarianceMode: 'Orientation-Agnostic Microgravity Payload Rack Frame',
        totalSamples: generatedSamples.length,
        exportDate: new Date().toISOString(),
      },
      samples: generatedSamples,
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OrbitHAR_Dataset_${currentExperiment.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadModelArtifacts = () => {
    const manifest = {
      modelName: 'OrbitHAR-HMR-v2.4-int8.onnx',
      version: '2.4.1-space-flight-release',
      targetRuntime: 'ONNX Runtime Edge / TensorRT / Coral Edge TPU',
      quantization: 'INT8 PTQ (Post-Training Quantization with Calibrated Spacecraft Lighting)',
      precision: '0.94 mAP@50 (HOI) / 18.2mm MPJPE (3D HMR relative to rack)',
      inputShape: [1, 3, 720, 1280],
      supportedFiducials: ['ArUco-4x4-50', 'AprilTag-36h11', 'QR-Payload-Origin'],
      offlineStandaloneCapable: true,
      pythonInferenceSnippet: `
# OrbitHAR Standalone Edge Inference Engine
import onnxruntime as ort
import numpy as np

# Load standalone INT8 quantized model
session = ort.InferenceSession("OrbitHAR-HMR-v2.4-int8.onnx", providers=["TensorrtExecutionProvider", "CPUExecutionProvider"])

def run_edge_har(frame_rgb, rack_fiducials):
    # Transform frame relative to payload rack fiducials
    inputs = {"video_frame": frame_rgb, "rack_origin": rack_fiducials}
    joints_3d, object_bboxes, hoi_action, step_prediction = session.run(None, inputs)
    return {
        "rack_relative_joints": joints_3d,
        "hoi_triplets": hoi_action,
        "current_step": step_prediction
    }
`,
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OrbitHAR_Model_Deliverable_Manifest.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dataset')}
            id="tab-dataset-generator"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'dataset'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Dataset Generation Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('model')}
            id="tab-edge-model"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'model'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Trained AI Model Deliverable (Edge Standalone)</span>
          </button>
        </div>

        <div>
          {activeTab === 'dataset' ? (
            <button
              onClick={downloadDatasetJson}
              id="export-dataset-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Annotations (.JSON)</span>
            </button>
          ) : (
            <button
              onClick={downloadModelArtifacts}
              id="download-model-package-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Model Manifest (.ONNX)</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dataset' ? (
        /* Tab 1: Dataset Generation Studio */
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>Synthetic Dataset Generation for Microgravity Experiments</span>
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Generates object detection boxes, 3D pose, and HOI based on protocol steps with 360° arbitrary floating angles.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Samples:</span>
                <select
                  value={numSamplesToGen}
                  onChange={(e) => setNumSamplesToGen(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  <option value={4}>4 Frames</option>
                  <option value={8}>8 Frames</option>
                  <option value={16}>16 Frames</option>
                  <option value={32}>32 Frames</option>
                </select>

                <button
                  onClick={handleGenerateSyntheticData}
                  id="generate-synthetic-btn"
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-mono transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Synthesizing...' : 'Synthesize Batched Frames'}</span>
                </button>
              </div>
            </div>

            {/* Generated Samples Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden mt-3">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">SAMPLE ID</th>
                      <th className="py-2 px-3">STEP LABEL</th>
                      <th className="py-2 px-3">ASTRONAUT POSE (P/R/Y)</th>
                      <th className="py-2 px-3">HOI TRIPLET</th>
                      <th className="py-2 px-3">ANNOTATIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300 text-[11px]">
                    {generatedSamples.map((sample) => (
                      <tr key={sample.sampleId} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-cyan-400 font-bold">{sample.sampleId}</td>
                        <td className="py-2 px-3 text-white">{sample.stepLabel}</td>
                        <td className="py-2 px-3 text-slate-400">
                          P:{sample.astronautPose.pitch}° | R:{sample.astronautPose.roll}° | Y:{sample.astronautPose.yaw}°
                        </td>
                        <td className="py-2 px-3 text-amber-300 font-medium">
                          {sample.hoiTriplet}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {sample.bboxCount} BBoxes • {sample.keypointsCount} Joints
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Trained AI Model Deliverable */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Architecture Card */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Model Architecture: OrbitHAR-HMR-v2.4</span>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-white font-bold">1. Orientation-Agnostic 3D HMR Backbone</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Uses relative rack fiducial homography to decouple body pose estimation from arbitrary zero-g floating angles (yaw/pitch/roll).
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-white font-bold">2. Edge YOLO-HOI Detection Head</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Trained for laboratory tool bounding boxes & hand-object interaction vectors (e.g. Micropipette, Cryovial, Centrifuge latch).
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-white font-bold">3. Sequence Finite State Machine (FSM)</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Markov sequence graph validates execution order, detects skipped steps, and predicts optimal next actions.
                  </div>
                </div>
              </div>
            </div>

            {/* Edge Hardware Benchmarks */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <span>Edge Spacecraft Hardware Benchmarks</span>
              </div>

              <div className="space-y-2">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">NVIDIA Jetson Orin Industrial</div>
                    <div className="text-[10px] text-slate-500">15W TDP • TensorRT INT8</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">14.2 ms</div>
                    <div className="text-[10px] text-slate-400">70.4 FPS</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">Google Coral Edge TPU v2</div>
                    <div className="text-[10px] text-slate-500">4W TDP • TFLite Quantized</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">19.8 ms</div>
                    <div className="text-[10px] text-slate-400">50.5 FPS</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">Rad-Hard Spacecraft Versal FPGA</div>
                    <div className="text-[10px] text-slate-500">20W TDP • Deep Space Grade</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">11.5 ms</div>
                    <div className="text-[10px] text-slate-400">87.0 FPS</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">Raspberry Pi CM4 Flight Payload</div>
                    <div className="text-[10px] text-slate-500">5W TDP • ONNX Runtime CPU</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">38.2 ms</div>
                    <div className="text-[10px] text-slate-400">26.2 FPS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
