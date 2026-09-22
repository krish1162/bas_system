// Audio Synthesizer for Spacecraft Avionics Chimes and Web Speech Voice Alerts

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a synthesized spacecraft avionics warning chime
 */
export function playAvionicsAlertChime(type: 'WARNING' | 'CRITICAL' | 'SUCCESS' | 'PROMPT' = 'WARNING') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'CRITICAL') {
      // Rapid pulsing dual-tone for severe anomaly
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1174.66, now); // D6

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === 'WARNING') {
      // Distinctive ISS / NASA caution tone (F#5 to A5 chime)
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, now); // F#5
      osc2.frequency.setValueAtTime(880.00, now); // A5

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'SUCCESS') {
      // Harmonious step-verified confirmation chime
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

      osc1.start(now);
      osc1.stop(now + 0.3);
    } else {
      // Soft prompt pip
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);
    }
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

/**
 * Text-to-Speech voice alert engine for astronaut notifications
 */
let currentlySpeaking = false;

export function isVoiceSpeaking(): boolean {
  return currentlySpeaking;
}

export function stopVoiceSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentlySpeaking = false;
  }
}

export function speakVoiceAlert(
  text: string, 
  options: { 
    mute?: boolean; 
    pitch?: number; 
    rate?: number; 
    chimeType?: 'WARNING' | 'CRITICAL' | 'SUCCESS' | 'PROMPT' | 'NONE';
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
) {
  if (options.mute) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech to deliver fresh alert

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.02; // natural pace for spaceflight avionics
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = 0.95;

    utterance.onstart = () => {
      currentlySpeaking = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      currentlySpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      currentlySpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    // Pick a clean English voice if available
    const voices = window.speechSynthesis.getVoices();
    const spaceVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (spaceVoice) {
      utterance.voice = spaceVoice;
    }

    const chimeType = options.chimeType !== undefined ? options.chimeType : 'PROMPT';
    if (chimeType !== 'NONE') {
      playAvionicsAlertChime(chimeType);
    }

    const delay = chimeType !== 'NONE' ? 220 : 50;
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, delay);
  } catch (err) {
    currentlySpeaking = false;
    console.warn('Speech synthesis alert failed:', err);
  }
}
