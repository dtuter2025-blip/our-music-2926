/**
 * Generates a pleasant, relaxing lofi/piano melody as a standard WAV audio blob
 * This ensures the 1 sample song plays immediately and reliably offline or online.
 */
export function generateSampleAudioBlobUrl(): string {
  const sampleRate = 44100;
  const duration = 16; // 16 seconds loop
  const totalSamples = sampleRate * duration;
  const numChannels = 2;

  // WAV header + PCM 16-bit data
  const buffer = new ArrayBuffer(44 + totalSamples * numChannels * 2);
  const view = new DataView(buffer);

  // Write WAV Header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * numChannels * 2, true);

  // Musical notes frequencies (Hz) - Key of C Major / A Minor (Peaceful school vibe)
  // C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, G5
  const notes: Record<string, number> = {
    C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25,
    D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0
  };

  // Melody score: [noteName, startTimeSec, durationSec, volume]
  const melodyEvents: [string, number, number, number][] = [
    // Bar 1 - C Major (0 - 4s)
    ['C3', 0.0, 3.8, 0.25],
    ['G3', 0.0, 3.8, 0.2],
    ['E4', 0.0, 1.0, 0.35],
    ['G4', 0.8, 0.8, 0.3],
    ['C5', 1.6, 1.2, 0.4],
    ['E5', 2.6, 1.2, 0.35],

    // Bar 2 - G Major (4 - 8s)
    ['G3', 4.0, 3.8, 0.25],
    ['D4', 4.0, 3.8, 0.2],
    ['D5', 4.0, 1.0, 0.35],
    ['B4', 4.8, 0.8, 0.3],
    ['G4', 5.6, 1.2, 0.35],
    ['D5', 6.6, 1.2, 0.35],

    // Bar 3 - A Minor (8 - 12s)
    ['A3', 8.0, 3.8, 0.25],
    ['E4', 8.0, 3.8, 0.2],
    ['C5', 8.0, 1.0, 0.4],
    ['A4', 8.8, 0.8, 0.35],
    ['E5', 9.6, 1.2, 0.4],
    ['D5', 10.6, 1.2, 0.3],

    // Bar 4 - F Major -> G (12 - 16s)
    ['F3', 12.0, 2.0, 0.25],
    ['C4', 12.0, 2.0, 0.2],
    ['A4', 12.0, 0.9, 0.35],
    ['C5', 12.8, 0.9, 0.35],
    ['G3', 14.0, 2.0, 0.25],
    ['D5', 14.0, 1.0, 0.35],
    ['C5', 14.8, 1.5, 0.45],
  ];

  // Synthesize soft electric piano / bell timbre with gentle decay & subtle stereo panning
  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  melodyEvents.forEach(([noteName, startSec, noteDur, vol], index) => {
    const freq = notes[noteName] || 440;
    const startSample = Math.floor(startSec * sampleRate);
    const numNoteSamples = Math.floor(noteDur * sampleRate);
    const pan = 0.3 + 0.4 * (index % 3) / 2; // subtle panning between 0.3 and 0.7

    for (let i = 0; i < numNoteSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      // Envelope: Fast attack, exponential decay
      const attack = Math.min(1, i / (sampleRate * 0.015));
      const decay = Math.exp(-t * (noteName.includes('3') ? 1.5 : 2.5));
      const envelope = attack * decay * vol;

      // Harmonic synthesis (Fundamental + 2nd harmonic + 3rd harmonic for warm bell/EP tone)
      const sampleValue = (
        Math.sin(2 * Math.PI * freq * t) * 0.65 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
      ) * envelope;

      const idx = startSample + i;
      leftChannel[idx] += sampleValue * (1 - pan);
      rightChannel[idx] += sampleValue * pan;
    }
  });

  // Convert float PCM (-1.0 to 1.0) to 16-bit signed integer
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    // Soft limiter / clipping protection
    const left = Math.max(-1, Math.min(1, leftChannel[i]));
    const right = Math.max(-1, Math.min(1, rightChannel[i]));

    const intLeft = left < 0 ? left * 0x8000 : left * 0x7FFF;
    const intRight = right < 0 ? right * 0x8000 : right * 0x7FFF;

    view.setInt16(offset, intLeft, true);
    view.setInt16(offset + 2, intRight, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
