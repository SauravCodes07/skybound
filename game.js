import { AudioManager } from './audio.js';
import { Background } from './background.js';
import { Bird } from './bird.js';
import { PipeManager } from './pipe.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class AssetPreloader {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.assets = new Map();
  }

  async load() {
    const jobs = [
      ['icon', 'assets/app-icon.svg'],
      ['glow', `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/></svg>')}`],
      ['fonts', 'fonts']
    ];
    let complete = 0;
    const progress = label => {
      complete += 1;
      this.onProgress(complete / jobs.length, label);
    };
    await Promise.all(jobs.map(async ([name, source]) => {
      if (source === 'fonts') {
        if (document.fonts?.ready) await document.fonts.ready;
        progress('Calibrating controls…');
        return;
      }
      await new Promise(resolve => {
        const image = new Image();
        image.onload = () => { this.assets.set(name, image); progress('Painting the horizon…'); resolve(); };
        image.onerror = () => { progress('Painting the horizon…'); resolve(); };
        image.src = source;
      });
    }));
    await new Promise(resolve => window.setTimeout(resolve, 280));
    return this.assets;
  }
}

class ParticleSystem {
  constructor() { this.items = []; }

  emit(x, y, options = {}) {
    const count = options.count || 10;
    for (let index = 0; index < count; index += 1) {
      const angle = (options.angle ?? Math.PI) + (Math.random() - .5) * (options.spread ?? 1.8);
      const speed = (options.speed ?? 100) * (.45 + Math.random() * .8);
      this.items.push({
        x, y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: options.life ?? .55,
        maxLife: options.life ?? .55,
        size: (options.size ?? 4) * (.5 + Math.random()),
        color: options.color ?? '#dffaff',
        gravity: options.gravity ?? 80,
        drag: options.drag ?? .96
      });
    }
    if (this.items.length > 180) this.items.splice(0, this.items.length - 180);
  }

  update(delta) {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.life -= delta;
      if (item.life <= 0) { this.items.splice(index, 1); continue; }
      item.velocityX *= Math.pow(item.drag, delta * 60);
      item.velocityY += item.gravity * delta;
      item.x += item.velocityX * delta;
      item.y += item.velocityY * delta;
    }
  }

  draw(context) {
    context.save();
    this.items.forEach(item => {
      context.globalAlpha = Math.max(0, item.life / item.maxLife);
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(item.x, item.y, item.size * (item.life / item.maxLife), 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  clear() { this.items.length = 0; }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.context = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.storage = new StorageManager();
    this.audio = new AudioManager(this.storage.data.settings);
    this.ui = new UIManager(this.storage, {
      play: () => this.startCountdown(),
      restart: () => this.startCountdown(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      menu: () => this.returnToMenu(),
      fullscreen: () => this.toggleFullscreen(),
      setting: (key, value) => this.settingChanged(key, value),
      skin: skin => this.bird.setSkin(skin),
      uiClick: () => this.audio.click()
    });
    this.state = 'loading';
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fixedStep = 1 / 120;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.goldenCleared = 0;
    this.pipesPassed = 0;
    this.flaps = 0;
    this.powerups = 0;
    this.flightTime = 0;
    this.slowMotion = 0;
    this.slowMotionDuration = 4;
    this.shake = 0;
    this.countdownValue = 0;
    this.resize();
    this.background = new Background(this.width, this.height);
    this.bird = new Bird(this.width, this.height, this.storage.data.selectedSkin);
    this.pipes = new PipeManager(this.width, this.height);
    this.particles = new ParticleSystem();
    this.bindEvents();
    this.boot();
  }

  async boot() {
    const preloader = new AssetPreloader((progress, label) => this.ui.setLoading(progress, label));
    await preloader.load();
    this.state = 'menu';
    this.ui.finishLoading();
    this.audio.startMusic();
    requestAnimationFrame(time => this.loop(time));
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (this.state === 'playing') this.flap();
    });
    window.addEventListener('keydown', event => {
      if (['Space', 'ArrowUp'].includes(event.code)) {
        event.preventDefault();
        if (this.state === 'playing') this.flap();
        else if (this.state === 'menu') this.startCountdown();
        else if (this.state === 'gameover') this.startCountdown();
      }
      if (event.code === 'KeyP' || event.code === 'Escape') {
        event.preventDefault();
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const previousWidth = this.width || rect.width;
    const previousHeight = this.height || rect.height;
    this.width = Math.max(320, rect.width || window.innerWidth);
    this.height = Math.max(540, rect.height || window.innerHeight);
    this.pixelRatio = Math.min(2.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    if (this.background) this.background.resize(this.width, this.height);
    if (this.pipes) this.pipes.resize(this.width, this.height);
    if (this.bird && previousWidth && previousHeight) {
      this.bird.x *= this.width / previousWidth;
      this.bird.y *= this.height / previousHeight;
    }
  }

  startCountdown() {
    this.audio.unlock().then(() => this.audio.startMusic()).catch(() => {});
    this.resetFlight();
    this.state = 'countdown';
    this.countdownRemaining = 3;
    this.countdownValue = 4;
    this.ui.showGameplay();
  }

  resetFlight() {
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.goldenCleared = 0;
    this.pipesPassed = 0;
    this.flaps = 0;
    this.powerups = 0;
    this.flightTime = 0;
    this.slowMotion = 0;
    this.shake = 0;
    this.bird.setSkin(this.storage.data.selectedSkin);
    this.bird.reset(this.width, this.height);
    this.pipes.reset();
    this.particles.clear();
    this.ui.updatePowerup(0, this.slowMotionDuration);
  }

  flap() {
    this.bird.flap();
    this.audio.flap();
    this.flaps += 1;
    this.particles.emit(this.bird.x - 16, this.bird.y + 5, { count: 5, angle: Math.PI, spread: .8, speed: 55, life: .35, size: 3, color: '#e7fbff', gravity: 20 });
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showGameplay();
    this.ui.updateScore(this.score, this.combo, this.getMultiplier());
    this.lastTime = performance.now();
  }

  returnToMenu() {
    this.state = 'menu';
    this.ui.hideCountdown();
    this.ui.showScreen('menu');
    this.bird.reset(this.width, this.height);
    this.pipes.reset();
    this.particles.clear();
  }

  settingChanged(key, value) {
    if (key === 'sound') this.audio.setSound(value);
    if (key === 'music') this.audio.setMusic(value);
  }

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      this.ui.toast('Fullscreen is unavailable in this browser');
    }
  }

  loop(timestamp) {
    const frameDelta = Math.min(.05, Math.max(0, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;
    if (this.state !== 'paused') {
      this.accumulator += frameDelta;
      let steps = 0;
      while (this.accumulator >= this.fixedStep && steps < 7) {
        this.update(this.fixedStep);
        this.accumulator -= this.fixedStep;
        steps += 1;
      }
      if (steps === 7) this.accumulator = 0;
    }
    this.render(timestamp);
    requestAnimationFrame(time => this.loop(time));
  }

  update(delta) {
    if (this.state === 'menu' || this.state === 'loading') {
      this.background.update(delta, .24);
      this.bird.update(delta, this.height, false);
      return;
    }
    if (this.state === 'countdown') {
      this.background.update(delta, .35);
      this.bird.update(delta, this.height, false);
      this.countdownRemaining -= delta;
      const value = Math.ceil(this.countdownRemaining);
      if (value !== this.countdownValue && value > 0) {
        this.countdownValue = value;
        this.ui.showCountdown(value);
      }
      if (this.countdownRemaining <= 0) {
        this.ui.hideCountdown();
        this.state = 'playing';
        this.flap();
      }
      return;
    }
    if (this.state === 'playing') this.updatePlaying(delta);
    if (this.state === 'crashed') this.updateCrash(delta);
  }

  updatePlaying(delta) {
    this.flightTime += delta;
    this.slowMotion = Math.max(0, this.slowMotion - delta);
    const speedFactor = this.slowMotion > 0 ? .58 : 1;
    this.background.update(delta, speedFactor);
    this.bird.update(delta, this.height, true);
    this.pipes.update(delta, this.score, speedFactor);
    this.particles.update(delta);
    this.ui.updatePowerup(this.slowMotion, this.slowMotionDuration);

    if (this.bird.trailTimer >= .075) {
      this.bird.trailTimer = 0;
      this.particles.emit(this.bird.x - 15, this.bird.y + 6, { count: 1, angle: Math.PI, spread: .25, speed: 34, life: .45, size: 4, color: this.slowMotion > 0 ? '#63eaff' : '#dff9ff', gravity: -5 });
    }

    const circle = this.bird.getHitCircle();
    for (const pipe of this.pipes.pipes) {
      if (pipe.collides(circle, this.pipes.groundY)) { this.crash(); return; }
      if (pipe.collectPowerup(circle)) this.activateSlowMotion();
      if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
        pipe.scored = true;
        this.scorePipe(pipe);
      }
    }
    if (circle.y + circle.radius >= this.pipes.groundY) this.crash();
  }

  scorePipe(pipe) {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.pipesPassed += 1;
    const multiplier = this.getMultiplier();
    const points = multiplier + (pipe.golden ? 2 : 0);
    this.score += points;
    if (pipe.golden) this.goldenCleared += 1;
    this.audio.point(pipe.golden);
    this.ui.updateScore(this.score, this.combo, multiplier, pipe.golden);
    this.particles.emit(this.bird.x + 8, this.bird.y, { count: pipe.golden ? 18 : 9, angle: 0, spread: 6.28, speed: pipe.golden ? 125 : 75, life: .7, size: pipe.golden ? 5 : 3, color: pipe.golden ? '#ffd45d' : '#a5f6ff', gravity: 25 });
  }

  getMultiplier() { return Math.min(3, 1 + Math.floor(Math.max(0, this.combo - 1) / 5)); }

  activateSlowMotion() {
    this.slowMotion = this.slowMotionDuration;
    this.powerups += 1;
    this.audio.powerup();
    this.ui.toast('TIME BEND ACTIVATED');
    this.particles.emit(this.bird.x, this.bird.y, { count: 28, angle: 0, spread: 6.28, speed: 150, life: .9, size: 5, color: '#69ecff', gravity: 0, drag: .985 });
  }

  crash() {
    if (this.state !== 'playing') return;
    this.state = 'crashed';
    this.bird.alive = false;
    this.bird.velocity = Math.max(-80, this.bird.velocity);
    this.crashTimer = .72;
    this.shake = this.storage.data.settings.reducedMotion ? 3 : 13;
    this.audio.hit();
    this.particles.emit(this.bird.x, this.bird.y, { count: 25, angle: 0, spread: 6.28, speed: 145, life: .75, size: 4, color: '#ff7893', gravity: 180 });
  }

  updateCrash(delta) {
    this.background.update(delta, .15);
    this.bird.update(delta, this.height, true);
    this.particles.update(delta);
    this.shake *= Math.pow(.02, delta);
    this.crashTimer -= delta;
    if (this.crashTimer <= 0) this.finishGame();
  }

  finishGame() {
    const result = {
      score: this.score,
      combo: this.bestCombo,
      golden: this.goldenCleared,
      pipes: this.pipesPassed,
      flaps: this.flaps,
      powerups: this.powerups,
      playTime: this.flightTime
    };
    const outcome = this.storage.recordGame(result);
    this.state = 'gameover';
    this.audio.gameOver();
    this.ui.showGameOver(result, outcome.isNewBest);
    outcome.unlocked.forEach((achievement, index) => window.setTimeout(() => this.ui.toast(`Achievement unlocked: ${achievement.title}`), 450 + index * 1200));
  }

  render(timestamp) {
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.save();
    if (this.shake > .05) context.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
    this.background.draw(context);
    if (['playing', 'paused', 'crashed', 'countdown'].includes(this.state)) this.pipes.draw(context, timestamp);
    this.particles.draw(context);
    if (this.state !== 'loading') this.bird.draw(context, timestamp, this.slowMotion > 0);
    context.restore();
    if (this.state === 'paused') {
      context.fillStyle = 'rgba(2,8,16,.18)';
      context.fillRect(0, 0, this.width, this.height);
    }
  }
}

new Game();
