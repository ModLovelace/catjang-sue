"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const sampleRate = 44100;

function createWavHeader(numSamples, numChannels = 1, sampleRate = 44100) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = numSamples * numChannels * 2;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

// 1. Generate dog-panting.m4a: 6-second seamless, rich, clearly audible puppy panting & happy whines
function generateDogPantingWav() {
  const duration = 6.0;
  const numSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(numSamples * 2);

  const pantRate = 3.3; // 3.3 pants per second (natural puppy panting)

  // Pre-generate pink noise for soft breath texture
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const noise = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    noise[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
    b6 = white * 0.115926;
  }

  // Bandpass filter simulation (mouth resonance around 800Hz - 1600Hz)
  let f1 = 0, f2 = 0;
  const bpNoise = new Float32Array(numSamples);
  const w0 = (2 * Math.PI * 950) / sampleRate;
  const alpha = Math.sin(w0) / (2 * 1.8);
  const cosw0 = Math.cos(w0);
  const b0_ = alpha, b2_ = -alpha, a0_ = 1 + alpha, a1_ = -2 * cosw0, a2_ = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < numSamples; i++) {
    const x0 = noise[i];
    const y0 = (b0_ * x0 + b2_ * x2 - a1_ * y1 - a2_ * y2) / a0_;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    bpNoise[i] = y0;
  }

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const phase = (t * pantRate) % 1.0;

    // Panting breath envelope: Exhale (ha) and Inhale (huff)
    let breath = 0;
    if (phase < 0.44) {
      // Exhale: rounded bell envelope
      const p = phase / 0.44;
      breath = Math.sin(p * Math.PI) * 0.65;
    } else if (phase > 0.52 && phase < 0.94) {
      // Inhale: slightly softer, crisp
      const p = (phase - 0.52) / 0.42;
      breath = Math.sin(p * Math.PI) * 0.42;
    }

    // Soft puppy contented whimpers / purr-sigh harmonics
    let puppyVocal = 0;
    // Whimper 1: at t = 1.0 - 1.8s (rising then falling pitch)
    if (t >= 0.9 && t <= 1.8) {
      const wt = (t - 0.9) / 0.9;
      const wEnv = Math.pow(Math.sin(wt * Math.PI), 1.5) * 0.28;
      const f = 460 + Math.sin(wt * Math.PI) * 90 - wt * 50;
      puppyVocal += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * wEnv;
    }
    // Whimper 2: at t = 3.6 - 4.5s
    if (t >= 3.6 && t <= 4.5) {
      const wt = (t - 3.6) / 0.9;
      const wEnv = Math.pow(Math.sin(wt * Math.PI), 1.5) * 0.24;
      const f = 490 + Math.sin(wt * Math.PI) * 70 - wt * 60;
      puppyVocal += (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * wEnv;
    }

    // Combine breath and vocalization
    const breathSample = bpNoise[i] * breath * 1.6;
    const combined = breathSample + puppyVocal;

    // Soft master envelope to ensure seamless looping without clicks
    let loopGain = 1.0;
    if (t < 0.08) loopGain = t / 0.08;
    else if (t > duration - 0.08) loopGain = (duration - t) / 0.08;

    const finalSample = Math.max(-0.95, Math.min(0.95, combined * loopGain * 1.25));
    data.writeInt16LE(Math.floor(finalSample * 32767), i * 2);
  }

  const header = createWavHeader(numSamples);
  return Buffer.concat([header, data]);
}

// 2. Generate dog-bark.m4a: Cute, clear, friendly puppy yip/bark (two friendly yips)
function generateDogBarkWav() {
  const duration = 1.2;
  const numSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(numSamples * 2);

  function addBark(startTime, pitchMult, amp) {
    const barkDur = 0.22;
    const startIdx = Math.floor(startTime * sampleRate);
    const endIdx = Math.min(numSamples, startIdx + Math.floor(barkDur * sampleRate));

    for (let i = startIdx; i < endIdx; i++) {
      const t = (i - startIdx) / sampleRate;
      const normT = t / barkDur;

      // Pitch contour: starts at ~420Hz, quick punch up, then drops
      const f0 = (420 * pitchMult) * (1.15 - 0.45 * Math.pow(normT, 0.7));
      // Envelope: sharp attack, natural exponential decay
      const env = Math.pow(normT, 0.3) * Math.exp(-normT * 7.5) * amp * 3.2;

      // Harmonic content: fundamental + body formants + breath punch
      const harm1 = Math.sin(2 * Math.PI * f0 * t);
      const harm2 = 0.45 * Math.sin(4 * Math.PI * f0 * t);
      const harm3 = 0.22 * Math.sin(6 * Math.PI * f0 * t);
      const noise = (Math.random() * 2 - 1) * 0.18 * Math.exp(-normT * 12);

      const s = (harm1 + harm2 + harm3 + noise) * env;
      const currentVal = data.readInt16LE(i * 2) / 32767;
      const merged = Math.max(-0.98, Math.min(0.98, currentVal + s));
      data.writeInt16LE(Math.floor(merged * 32767), i * 2);
    }
  }

  // Two happy puppy yips
  addBark(0.04, 1.0, 0.85);
  addBark(0.28, 1.15, 0.75);

  const header = createWavHeader(numSamples);
  return Buffer.concat([header, data]);
}

const outDir = path.join(__dirname, "..", "workspace", "assets", "sound");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const pantingWav = path.join(__dirname, "temp_panting.wav");
const pantingM4a = path.join(outDir, "dog-panting.m4a");
fs.writeFileSync(pantingWav, generateDogPantingWav());
spawnSync(ffmpegPath, ["-y", "-i", pantingWav, "-c:a", "aac", "-b:a", "128k", pantingM4a]);
if (fs.existsSync(pantingWav)) fs.unlinkSync(pantingWav);
console.log(`Generated: ${pantingM4a} (${fs.statSync(pantingM4a).size} bytes)`);

const barkWav = path.join(__dirname, "temp_bark.wav");
const barkM4a = path.join(outDir, "dog-bark.m4a");
fs.writeFileSync(barkWav, generateDogBarkWav());
spawnSync(ffmpegPath, ["-y", "-i", barkWav, "-c:a", "aac", "-b:a", "128k", barkM4a]);
if (fs.existsSync(barkWav)) fs.unlinkSync(barkWav);
console.log(`Generated: ${barkM4a} (${fs.statSync(barkM4a).size} bytes)`);
