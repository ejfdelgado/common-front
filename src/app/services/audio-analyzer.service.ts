// audio-analyzer.service.ts
// Requires: npm install meyda web-audio-beat-detector
// Types:    npm install --save-dev @types/node

import { Injectable, EventEmitter, OnDestroy } from '@angular/core';
import Meyda from 'meyda';
import type { MeydaFeaturesObject } from 'meyda';
import { analyze } from 'web-audio-beat-detector';

// ─────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────

/** Perceived brightness of the sound (0–1) */
export type Brightness = number;

/** Detected musical note name, e.g. "C", "F#", "Bb" */
export type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/**
 * Harmonic complexity rating derived from chroma spread.
 * "simple"  → 1–2 dominant pitches (power chords, drones)
 * "moderate"→ 3–4 pitches (triads, 7ths)
 * "complex" → 5+ pitches (jazz chords, dense polyphony)
 */
export type HarmonicComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Broad tonal quality of the sound.
 * "tonal"  → clear pitched content (melody, chords)
 * "noisy"  → broadband noise (cymbals, distortion)
 * "mixed"  → combination of both
 */
export type TonalCharacter = 'tonal' | 'noisy' | 'mixed';

/**
 * Overall energy tier — useful for lighting/colour decisions.
 * "silent" → RMS below noise floor
 * "quiet"  → soft passages
 * "medium" → normal listening level
 * "loud"   → climax / drop
 */
export type EnergyLevel = 'silent' | 'quiet' | 'medium' | 'loud';

/**
 * Complete audio feature snapshot emitted every analysis frame (~60 fps).
 * All values are normalised to [0, 1] unless noted otherwise.
 */
export interface AudioFeatures {
  // ── Timing ──────────────────────────────────────────────────────────────
  /** Detected tempo in beats-per-minute (set once after analysis; 0 until ready) */
  bpm: number;
  /** True for exactly one frame when a beat onset is detected */
  isBeat: boolean;
  /** Milliseconds since last detected beat onset */
  timeSinceLastBeatMs: number;

  // ── Energy ───────────────────────────────────────────────────────────────
  /** Root-mean-square loudness [0, 1] */
  rms: number;
  /** Loudness in decibels relative to full scale (negative; 0 dBFS = maximum) */
  loudnessDb: number;
  /** Perceptual loudness (Meyda "loudness.total") [0, ~1] */
  perceptualLoudness: number;
  /** Categorised energy tier */
  energyLevel: EnergyLevel;

  // ── Spectral / Tone ───────────────────────────────────────────────────────
  /** Spectral centroid — perceived brightness [0, 1] */
  brightness: Brightness;
  /** Spectral rolloff point [0, 1] — frequency below which 85 % of energy lives */
  spectralRolloff: number;
  /** Spectral flatness — 0 = pure tone, 1 = pure noise */
  spectralFlatness: number;
  /** Tonal character classification */
  tonalCharacter: TonalCharacter;
  /** Zero-crossing rate — higher = noisier / more percussive [0, 1] */
  zcr: number;

  /** Raw full FFT magnitude spectrum (Float32Array) */
  spectrum: Float32Array | null;
  /**
   * Sub-band energy split [bass, lowMid, highMid, treble] each [0, 1].
   * bass     :   20–250 Hz
   * lowMid   :  250–2 kHz
   * highMid  :  2–6 kHz
   * treble   :  6–20 kHz
   */
  bands: { bass: number; lowMid: number; highMid: number; treble: number };

  // ── Harmony / Pitch ───────────────────────────────────────────────────────
  /**
   * 12-element chroma vector (C through B), each [0, 1].
   * Represents the relative energy in each pitch class.
   */
  chroma: number[];
  /** Most dominant pitch class in the current frame */
  dominantNote: NoteName;
  /** Second most prominent pitch class (useful for interval detection) */
  secondaryNote: NoteName;
  /** Harmonic complexity rating */
  harmonicComplexity: HarmonicComplexity;
  /** Chroma entropy — 0 = single note, 1 = all notes equally active */
  chromaEntropy: number;

  // ── Timbre ────────────────────────────────────────────────────────────────
  /**
   * First 13 Mel-Frequency Cepstral Coefficients.
   * MFCC[0] ≈ overall energy; MFCC[1..12] capture timbral shape.
   * Useful for genre / instrument classification.
   */
  mfcc: number[];
  /** Spectral spread — width of the frequency distribution [0, 1] */
  spectralSpread: number;
  /** Spectral skewness — asymmetry of the spectrum */
  spectralSkewness: number;
  /** Spectral kurtosis — peakedness of the spectrum */
  spectralKurtosis: number;

  // ── Meta ─────────────────────────────────────────────────────────────────
  /** Current playback position in seconds */
  currentTimeS: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
}

/** Subset of AudioFeatures emitted on beat events only */
export interface BeatEvent {
  bpm: number;
  timeSinceLastBeatMs: number;
  rms: number;
  dominantNote: NoteName;
  energyLevel: EnergyLevel;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const NOTE_NAMES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Meyda buffer size — 2048 gives ~46 fps at 44.1 kHz; increase to 4096 for more freq resolution */
const BUFFER_SIZE = 2048;

/** RMS thresholds for EnergyLevel classification */
const ENERGY_THRESHOLDS = { silent: 0.01, quiet: 0.08, medium: 0.35 } as const;

/** Beat onset detection: RMS must jump by this factor vs rolling average */
const BEAT_RMS_MULTIPLIER = 1.4;

/** Rolling window length (frames) for beat onset detection */
const BEAT_HISTORY_LENGTH = 20;

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AudioAnalyzerService implements OnDestroy {

  // ── Public event emitters ──────────────────────────────────────────────

  /** Emits a full feature snapshot on every analysis frame (~60 fps) */
  readonly features$ = new EventEmitter<AudioFeatures>();

  /** Emits only on detected beat onsets */
  readonly beat$ = new EventEmitter<BeatEvent>();

  /** Emits true/false when playback starts or stops */
  readonly playState$ = new EventEmitter<boolean>();

  // ── Private state ──────────────────────────────────────────────────────

  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private meydaAnalyzer: ReturnType<typeof Meyda.createMeydaAnalyzer> | null = null;

  private audioEl: HTMLAudioElement | null = null;
  private boundPlay!: () => void;
  private boundPause!: () => void;
  private boundEnded!: () => void;

  private bpm = 0;
  private isPlaying = false;
  private lastBeatTimeMs = 0;
  private rmsHistory: number[] = [];

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Bind the service to an HTMLAudioElement.
   * Safe to call again with a different element — previous bindings are cleaned up first.
   *
   * @param audioElement  The <audio> element to analyse
   */
  bind(audioElement: HTMLAudioElement): void {
    this.unbind();

    this.audioEl = audioElement;

    this.boundPlay  = () => this.onPlay();
    this.boundPause = () => this.onPause();
    this.boundEnded = () => this.onPause();

    audioElement.addEventListener('play',  this.boundPlay);
    audioElement.addEventListener('pause', this.boundPause);
    audioElement.addEventListener('ended', this.boundEnded);

    // If audio is already playing when bind() is called, start immediately
    if (!audioElement.paused) {
      this.onPlay();
    }
  }

  /**
   * Detach from the current audio element and stop all analysis.
   */
  unbind(): void {
    this.stopAnalysis();

    if (this.audioEl) {
      this.audioEl.removeEventListener('play',  this.boundPlay);
      this.audioEl.removeEventListener('pause', this.boundPause);
      this.audioEl.removeEventListener('ended', this.boundEnded);
      this.audioEl = null;
    }
  }

  /**
   * Kick off async BPM analysis on the currently loaded audio.
   * This runs once and stores the result in `this.bpm`.
   * Called automatically on play; can also be called manually (e.g. after `src` changes).
   */
  async analyseBpm(): Promise<number> {
    if (!this.audioEl || !this.audioCtx) return 0;

    try {
      // Fetch the audio file as an ArrayBuffer and decode it offline
      const response = await fetch(this.audioEl.currentSrc || this.audioEl.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.bpm = await analyze(audioBuffer);
      return this.bpm;
    } catch (err) {
      console.warn('[AudioAnalyzerService] BPM analysis failed:', err);
      return 0;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.unbind();
    this.audioCtx?.close();
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private onPlay(): void {
    this.isPlaying = true;
    this.playState$.emit(true);
    this.startAnalysis();
    // Kick off BPM detection in the background (don't block play)
    void this.analyseBpm();
  }

  private onPause(): void {
    this.isPlaying = false;
    this.playState$.emit(false);
    this.stopAnalysis();
  }

  private startAnalysis(): void {
    if (!this.audioEl) return;

    // Lazily create AudioContext — must happen after a user gesture
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    // Build Web Audio graph: audio element → analyser → destination
    if (!this.sourceNode) {
      this.sourceNode  = this.audioCtx.createMediaElementSource(this.audioEl);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = BUFFER_SIZE * 2; // Double for better freq resolution
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    }

    // Create Meyda analyzer
    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioCtx,
      source: this.sourceNode,
      bufferSize: BUFFER_SIZE,
      featureExtractors: [
        'rms',
        'loudness',
        'spectralCentroid',
        'spectralRolloff',
        'spectralFlatness',
        'spectralSpread',
        'spectralSkewness',
        'spectralKurtosis',
        'chroma',
        'mfcc',
        'zcr',
        'amplitudeSpectrum',
      ],
      callback: (meydaFeatures: MeydaFeaturesObject) => {
        if (!this.audioEl || !this.analyserNode) return;
        const snapshot = this.buildFeatureSnapshot(meydaFeatures);
        this.features$.emit(snapshot);

        if (snapshot.isBeat) {
          this.beat$.emit({
            bpm:                snapshot.bpm,
            timeSinceLastBeatMs: snapshot.timeSinceLastBeatMs,
            rms:                snapshot.rms,
            dominantNote:       snapshot.dominantNote,
            energyLevel:        snapshot.energyLevel,
          });
        }
      },
    });

    this.meydaAnalyzer.start();
  }

  private stopAnalysis(): void {
    this.meydaAnalyzer?.stop();
    this.meydaAnalyzer = null;
    this.rmsHistory = [];
  }

  // ── Feature computation ────────────────────────────────────────────────

  private buildFeatureSnapshot(f: MeydaFeaturesObject): AudioFeatures {
    const rms    = this.safeNum(f.rms);
    const isBeat = this.detectBeatOnset(rms);

    const spectrum = f.amplitudeSpectrum
      ? (f.amplitudeSpectrum as Float32Array)
      : null;

    const chroma: number[] = Array.isArray(f.chroma)
      ? (f.chroma as number[])
      : new Array(12).fill(0);

    const mfcc: number[] = Array.isArray(f.mfcc)
      ? (f.mfcc as number[])
      : new Array(13).fill(0);

    const spectralCentroid = this.safeNum(f.spectralCentroid);
    const spectralRolloff  = this.safeNum(f.spectralRolloff);
    const spectralFlatness = this.safeNum(f.spectralFlatness);
    const spectralSpread   = this.safeNum(f.spectralSpread);
    const spectralSkewness = this.safeNum(f.spectralSkewness);
    const spectralKurtosis = this.safeNum(f.spectralKurtosis);
    const zcr              = this.safeNum(f.zcr);

    // Perceptual loudness (Meyda returns { total, specific })
    const loudnessObj        = f.loudness as { total?: number; specific?: Float32Array } | null;
    const perceptualLoudness = loudnessObj?.total != null
      ? Math.min(loudnessObj.total / 100, 1)
      : 0;

    const loudnessDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

    // Normalised brightness from spectral centroid (Meyda returns Hz)
    const sampleRate  = this.audioCtx?.sampleRate ?? 44100;
    const brightness  = Math.min(spectralCentroid / (sampleRate / 2), 1);
    const rolloffNorm = Math.min(spectralRolloff  / (sampleRate / 2), 1);

    const bands = spectrum
      ? this.computeBands(spectrum, sampleRate)
      : { bass: 0, lowMid: 0, highMid: 0, treble: 0 };

    const dominantNote   = this.dominantChromaPitch(chroma, 0);
    const secondaryNote  = this.dominantChromaPitch(chroma, 1);
    const chromaEntropy  = this.computeEntropy(chroma);
    const harmonicComplexity = this.classifyHarmonicComplexity(chroma);
    const tonalCharacter     = this.classifyTonalCharacter(spectralFlatness);
    const energyLevel        = this.classifyEnergy(rms);

    const nowMs               = performance.now();
    const timeSinceLastBeatMs = isBeat
      ? (() => { const dt = nowMs - this.lastBeatTimeMs; this.lastBeatTimeMs = nowMs; return dt; })()
      : nowMs - this.lastBeatTimeMs;

    return {
      bpm:              this.bpm,
      isBeat,
      timeSinceLastBeatMs,
      rms,
      loudnessDb,
      perceptualLoudness,
      energyLevel,
      brightness,
      spectralRolloff:  rolloffNorm,
      spectralFlatness,
      tonalCharacter,
      zcr:              Math.min(zcr / (BUFFER_SIZE / 2), 1),
      spectrum,
      bands,
      chroma,
      dominantNote,
      secondaryNote,
      harmonicComplexity,
      chromaEntropy,
      mfcc,
      spectralSpread:   Math.min(spectralSpread / (sampleRate / 2), 1),
      spectralSkewness,
      spectralKurtosis,
      currentTimeS:     this.audioEl?.currentTime ?? 0,
      isPlaying:        this.isPlaying,
    };
  }

  /**
   * Simple energy-based beat onset detection.
   * Compares current RMS against a rolling average; a beat is detected when
   * the signal exceeds the average by `BEAT_RMS_MULTIPLIER`.
   */
  private detectBeatOnset(rms: number): boolean {
    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > BEAT_HISTORY_LENGTH) {
      this.rmsHistory.shift();
    }
    if (this.rmsHistory.length < BEAT_HISTORY_LENGTH) return false;

    const avg = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
    return rms > avg * BEAT_RMS_MULTIPLIER && rms > ENERGY_THRESHOLDS.quiet;
  }

  /**
   * Split amplitude spectrum into 4 perceptual frequency bands.
   * Each value is normalised to [0, 1] relative to the band's own peak.
   */
  private computeBands(
    spectrum: Float32Array,
    sampleRate: number,
  ): AudioFeatures['bands'] {
    const nyquist    = sampleRate / 2;
    const binHz      = nyquist / spectrum.length;
    const bandRanges = {
      bass:    [20,   250],
      lowMid:  [250, 2000],
      highMid: [2000, 6000],
      treble:  [6000, 20000],
    } as const;

    const bandEnergy = (lo: number, hi: number): number => {
      const start = Math.floor(lo / binHz);
      const end   = Math.min(Math.ceil(hi / binHz), spectrum.length);
      let sum = 0;
      for (let i = start; i < end; i++) sum += spectrum[i] * spectrum[i];
      return Math.sqrt(sum / Math.max(end - start, 1));
    };

    const raw = {
      bass:    bandEnergy(...bandRanges.bass),
      lowMid:  bandEnergy(...bandRanges.lowMid),
      highMid: bandEnergy(...bandRanges.highMid),
      treble:  bandEnergy(...bandRanges.treble),
    };

    // Normalise each band to [0, 1]
    const maxVal = Math.max(...Object.values(raw), 1e-9);
    return {
      bass:    raw.bass    / maxVal,
      lowMid:  raw.lowMid  / maxVal,
      highMid: raw.highMid / maxVal,
      treble:  raw.treble  / maxVal,
    };
  }

  /**
   * Return the note name at the nth highest chroma bin.
   * rank = 0 → dominant, rank = 1 → secondary, etc.
   */
  private dominantChromaPitch(chroma: number[], rank: number): NoteName {
    const indexed = chroma.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => b.v - a.v);
    return NOTE_NAMES[indexed[rank]?.i ?? 0];
  }

  /**
   * Shannon entropy of the chroma vector, normalised to [0, 1].
   * Low entropy → one or two dominant notes.
   * High entropy → all 12 pitches equally present.
   */
  private computeEntropy(chroma: number[]): number {
    const total = chroma.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const norm = chroma.map(v => v / total);
    const H    = norm.reduce((acc, p) => (p > 0 ? acc - p * Math.log2(p) : acc), 0);
    return H / Math.log2(12); // Normalise by max possible entropy
  }

  private classifyHarmonicComplexity(chroma: number[]): HarmonicComplexity {
    const threshold  = 0.25; // Fraction of max chroma value to count a note as "active"
    const maxChroma  = Math.max(...chroma);
    const activeNotes = chroma.filter(v => v >= maxChroma * threshold).length;
    if (activeNotes <= 2) return 'simple';
    if (activeNotes <= 4) return 'moderate';
    return 'complex';
  }

  private classifyTonalCharacter(flatness: number): TonalCharacter {
    if (flatness < 0.2)  return 'tonal';
    if (flatness > 0.65) return 'noisy';
    return 'mixed';
  }

  private classifyEnergy(rms: number): EnergyLevel {
    if (rms < ENERGY_THRESHOLDS.silent) return 'silent';
    if (rms < ENERGY_THRESHOLDS.quiet)  return 'quiet';
    if (rms < ENERGY_THRESHOLDS.medium) return 'medium';
    return 'loud';
  }

  private safeNum(v: unknown): number {
    return typeof v === 'number' && isFinite(v) ? v : 0;
  }
}
