"use client";

// Dam olish tugaganda: tebranish (faqat Android'da ishlaydi — iPhone brauzeri
// buni qo'llamaydi) va qisqa signal. Ovoz brauzer qoidasiga ko'ra faqat
// foydalanuvchi harakatidan keyin yoqiladi, shu sabab "✓" bosilganda
// unlockRestAudio() chaqiriladi.
let audio: AudioContext | null = null;

function getContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

export function unlockRestAudio() {
  try {
    const Context = getContextClass();
    if (!Context) return;
    audio ??= new Context();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // Ovoz bo'lmasa ham taymer ishlayveradi.
  }
}

export function playRestEnd() {
  try {
    navigator.vibrate?.([220, 120, 220]);
  } catch {
    // vibrate qo'llanmasa — e'tiborsiz.
  }
  if (!audio) return;
  try {
    const start = audio.currentTime;
    [0, 0.22].forEach((offset, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
      osc.connect(gain).connect(audio!.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.2);
    });
  } catch {
    // e'tiborsiz
  }
}
