export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.master.gain.value = this.settings.sound ? 0.72 : 0;
      this.musicGain.gain.value = this.settings.music ? 0.12 : 0;
      this.musicGain.connect(this.context.destination);
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setSound(enabled) {
    this.settings.sound = enabled;
    if (this.master && this.context) this.master.gain.setTargetAtTime(enabled ? 0.72 : 0, this.context.currentTime, .025);
  }

  setMusic(enabled) {
    this.settings.music = enabled;
    if (this.musicGain && this.context) this.musicGain.gain.setTargetAtTime(enabled ? 0.12 : 0, this.context.currentTime, .08);
    if (enabled) this.startMusic(); else this.stopMusic();
  }

  tone({ frequency = 440, endFrequency = frequency, duration = .1, type = 'sine', volume = .2, delay = 0 }) {
    if (!this.context || !this.settings.sound) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  noise(duration = .15, volume = .12) {
    if (!this.context || !this.settings.sound) return;
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) channel[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  flap() { this.tone({ frequency: 520, endFrequency: 760, duration: .085, type: 'triangle', volume: .13 }); }
  point(golden = false) {
    this.tone({ frequency: golden ? 620 : 850, endFrequency: golden ? 1240 : 1150, duration: .12, type: 'sine', volume: .15 });
    if (golden) this.tone({ frequency: 930, endFrequency: 1500, duration: .16, type: 'sine', volume: .1, delay: .06 });
  }
  powerup() {
    [0, .06, .12, .18].forEach((delay, index) => this.tone({ frequency: 420 + index * 180, endFrequency: 650 + index * 210, duration: .18, type: 'sine', volume: .09, delay }));
  }
  hit() { this.noise(.2, .2); this.tone({ frequency: 180, endFrequency: 52, duration: .3, type: 'sawtooth', volume: .17 }); }
  gameOver() {
    [0, .14, .28].forEach((delay, index) => this.tone({ frequency: [392, 311, 196][index], duration: .32, type: 'triangle', volume: .1, delay }));
  }
  click() { this.tone({ frequency: 600, endFrequency: 720, duration: .045, type: 'sine', volume: .05 }); }

  startMusic() {
    if (!this.settings.music || !this.context || this.musicTimer) return;
    const notes = [196, 246.94, 293.66, 369.99, 293.66, 246.94, 220, 277.18];
    const playStep = () => {
      if (!this.context || !this.settings.music) return;
      const start = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = notes[this.musicStep % notes.length];
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.19, start + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .75);
      oscillator.connect(gain).connect(this.musicGain);
      oscillator.start(start);
      oscillator.stop(start + .8);
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 680);
  }

  stopMusic() {
    window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }
}
