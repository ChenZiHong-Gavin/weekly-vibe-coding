import { useState, useCallback, useRef } from 'react';

interface VoiceRecognitionResult {
  isListening: boolean;
  isProcessing: boolean;
  isPrepared: boolean;
  isPreparing: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  prepare: () => Promise<void>;
  result: BackendResponse | null;
  reset: () => void;
  waveform?: number[];
}

export interface BackendResponse {
  success: boolean;
  spell?: string;
  score?: number;
  user_phonemes?: string;
  target_phonemes?: string;
  error?: string;
}

// Backend endpoint
const VOICE_API_ENDPOINT = 'http://localhost:8000/cast_spell';

export const useBackendVoiceRecognition = (
  spellName: string
): VoiceRecognitionResult => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrepared, setIsPrepared] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackendResponse | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRateRef = useRef<number>(44100);
  const samplesRef = useRef<Float32Array[]>([]);
  const spellNameRef = useRef<string>('');
  const collectingRef = useRef<boolean>(false);

  const sendAudioToBackend = async (audioBlob: Blob): Promise<BackendResponse> => {
    const currentSpell = spellNameRef.current || spellName;
    if (!currentSpell || !currentSpell.trim()) {
      throw new Error('未选择咒语');
    }
    if (!audioBlob || (audioBlob as any).size === 0) {
      throw new Error('录音数据为空');
    }
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('spell_name', currentSpell);

    try {
      const response = await fetch(VOICE_API_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Backend voice recognition error:', err);
      throw err;
    }
  };

  const processRecording = async () => {
    if (samplesRef.current.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const inputRate = inputRateRef.current;
      const totalLen = samplesRef.current.reduce((a, b) => a + b.length, 0);
      const merged = new Float32Array(totalLen);
      let offset = 0;
      for (const chunk of samplesRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const targetRate = 16000;
      const resampleFactor = inputRate / targetRate;
      const outLen = Math.floor(merged.length / resampleFactor);
      const resampled = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const idx = i * resampleFactor;
        const i0 = Math.floor(idx);
        const i1 = Math.min(i0 + 1, merged.length - 1);
        const t = idx - i0;
        resampled[i] = merged[i0] * (1 - t) + merged[i1] * t;
      }
      const buffer = new ArrayBuffer(44 + resampled.length * 2);
      const view = new DataView(buffer);
      const writeString = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + resampled.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, targetRate, true);
      view.setUint32(28, targetRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, resampled.length * 2, true);
      let pos = 44;
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        pos += 2;
      }
      const audioBlob = new Blob([buffer], { type: 'audio/wav' });
      const backendResult = await sendAudioToBackend(audioBlob);
      setResult(backendResult);
      if (!backendResult.success && backendResult.error) setError(backendResult.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      samplesRef.current = [];
    }
  };

  const prepare = useCallback(async () => {
    setError(null);
    if (isPrepared || isPreparing) return;
    setIsPreparing(true);
    try {
      spellNameRef.current = spellName;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx: AudioContext = new AudioCtx();
      audioCtxRef.current = audioCtx;
      inputRateRef.current = audioCtx.sampleRate;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      try {
        await audioCtx.audioWorklet.addModule(new URL('../worklets/pcm-processor.js', import.meta.url));
        const node = new AudioWorkletNode(audioCtx, 'pcm-processor');
        workletRef.current = node;
        node.port.onmessage = (e) => {
          if (!collectingRef.current) return;
          const data = e.data;
          const chunk = data instanceof ArrayBuffer ? new Float32Array(data) : data;
          samplesRef.current.push(new Float32Array(chunk));
        };
      } catch {
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (!collectingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          samplesRef.current.push(new Float32Array(input));
        };
      }
      setIsPrepared(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    } finally {
      setIsPreparing(false);
    }
  }, [spellName, isPrepared, isPreparing]);

  const startListening = useCallback(async () => {
    setError(null);
    setResult(null);
    samplesRef.current = [];
    if (!isPrepared) {
      await prepare();
    }
    let source = sourceRef.current;
    const audioCtx = audioCtxRef.current as AudioContext;
    if (!source && streamRef.current && audioCtx) {
      source = audioCtx.createMediaStreamSource(streamRef.current);
      sourceRef.current = source;
    }
    if (!source || !audioCtx) {
      setError('Audio not prepared');
      return;
    }
    if (workletRef.current) {
      source.connect(workletRef.current);
      workletRef.current.connect(audioCtx.destination);
    } else if (processorRef.current) {
      source.connect(processorRef.current);
      processorRef.current.connect(audioCtx.destination);
    }
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    source.connect(analyser);
    collectingRef.current = true;
    const loop = () => {
      if (!analyserRef.current) return;
      const a = analyserRef.current;
      const buf = new Uint8Array(a.frequencyBinCount);
      a.getByteTimeDomainData(buf);
      const normalized = Array.from(buf, v => (v - 128) / 128);
      setWaveform(normalized);
      rafRef.current = (typeof window !== 'undefined' ? window.requestAnimationFrame(loop) : null) as any;
    };
    loop();
    setIsListening(true);
  }, [prepare, isPrepared]);

  const stopListening = useCallback(() => {
    if (workletRef.current) {
      try { workletRef.current.disconnect(); } catch {}
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch {}
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (rafRef.current !== null) {
      if (typeof window !== 'undefined') window.cancelAnimationFrame(rafRef.current as number);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
    }
    collectingRef.current = false;
    setIsListening(false);
    processRecording();
  }, []);

  const reset = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current.port.onmessage = null as any;
      workletRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null as any;
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (rafRef.current !== null) {
      if (typeof window !== 'undefined') window.cancelAnimationFrame(rafRef.current as number);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    samplesRef.current = [];
    setIsListening(false);
    setIsProcessing(false);
    setError(null);
    setResult(null);
    setIsPrepared(false);
    setIsPreparing(false);
  }, []);

  return {
    isListening,
    isProcessing,
    isPrepared,
    isPreparing,
    error,
    prepare,
    startListening,
    stopListening,
    result,
    reset,
    waveform,
  };
};
