import { ACHIEVEMENTS, SKINS } from './storage.js';

const byId = id => document.getElementById(id);

export class UIManager {
  constructor(storage, callbacks) {
    this.storage = storage;
    this.callbacks = callbacks;
    this.currentScreen = null;
    this.previousScreen = 'menu';
    this.toastTimer = 0;
    this.screens = [...document.querySelectorAll('[data-screen]')];
    this.elements = {
      loading: byId('loadingScreen'), loadBar: byId('loadBar'), loadLabel: byId('loadLabel'),
      hud: byId('hud'), score: byId('scoreValue'), combo: byId('comboValue'), powerup: byId('powerupBadge'),
      countdown: byId('countdown'), toast: byId('toast'), mute: byId('muteButton'),
      sound: byId('soundToggle'), music: byId('musicToggle'), dark: byId('darkToggle'), motion: byId('motionToggle')
    };
    this.bindEvents();
    this.applySettings();
  }

  bindEvents() {
    byId('playButton').addEventListener('click', () => this.callbacks.play());
    byId('restartButton').addEventListener('click', () => this.callbacks.restart());
    byId('pauseRestartButton').addEventListener('click', () => this.callbacks.restart());
    byId('pauseButton').addEventListener('click', () => this.callbacks.pause());
    byId('resumeButton').addEventListener('click', () => this.callbacks.resume());
    byId('pauseMenuButton').addEventListener('click', () => this.callbacks.menu());
    byId('gameOverMenuButton').addEventListener('click', () => this.callbacks.menu());
    byId('muteButton').addEventListener('click', () => this.toggleAllAudio());
    byId('fullscreenButton').addEventListener('click', () => this.callbacks.fullscreen());
    document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => this.showScreen(button.dataset.open)));
    document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => this.showScreen('menu')));
    this.elements.sound.addEventListener('click', () => this.toggleSetting('sound'));
    this.elements.music.addEventListener('click', () => this.toggleSetting('music'));
    this.elements.dark.addEventListener('click', () => this.toggleSetting('dark'));
    this.elements.motion.addEventListener('click', () => this.toggleSetting('reducedMotion'));
    document.addEventListener('click', event => {
      if (event.target.closest('button')) this.callbacks.uiClick();
    });
  }

  setLoading(progress, label) {
    this.elements.loadBar.style.width = `${Math.round(progress * 100)}%`;
    this.elements.loadLabel.textContent = label;
  }

  finishLoading() {
    this.elements.loading.classList.add('done');
    window.setTimeout(() => this.elements.loading.classList.add('hidden'), 650);
    this.showScreen('menu');
  }

  hideAllScreens() {
    this.screens.forEach(screen => screen.classList.add('hidden'));
  }

  showScreen(name) {
    this.previousScreen = this.currentScreen || 'menu';
    this.currentScreen = name;
    this.hideAllScreens();
    const target = document.querySelector(`[data-screen="${name}"]`);
    if (target) target.classList.remove('hidden');
    this.elements.hud.classList.add('hidden');
    if (name === 'menu') this.renderMenu();
    if (name === 'settings') this.renderSettings();
    if (name === 'scores') this.renderScores();
    if (name === 'stats') this.renderStats();
    if (name === 'achievements') this.renderAchievements();
  }

  showGameplay() {
    this.currentScreen = 'game';
    this.hideAllScreens();
    this.elements.hud.classList.remove('hidden');
    this.updateScore(0, 0, 1);
  }

  showPause() {
    this.showScreen('pause');
    this.elements.hud.classList.remove('hidden');
  }

  showGameOver(result, isNewBest) {
    this.showScreen('gameover');
    byId('finalScore').textContent = result.score;
    byId('finalBest').textContent = this.storage.data.highScore;
    byId('finalCombo').textContent = result.combo;
    byId('finalGolden').textContent = result.golden;
    byId('resultTitle').textContent = result.score === 0 ? 'Almost airborne' : result.score < 10 ? 'Good flight' : result.score < 25 ? 'Beautiful rhythm' : 'Sky mastered';
    byId('newBest').classList.toggle('hidden', !isNewBest);
  }

  showCountdown(value) {
    const element = this.elements.countdown;
    element.textContent = value;
    element.classList.remove('hidden');
    element.style.animation = 'none';
    void element.offsetWidth;
    element.style.animation = '';
  }

  hideCountdown() { this.elements.countdown.classList.add('hidden'); }

  updateScore(score, combo, multiplier, golden = false) {
    this.elements.score.textContent = score;
    this.elements.score.classList.remove('bump');
    void this.elements.score.offsetWidth;
    this.elements.score.classList.add('bump');
    this.elements.combo.textContent = combo > 1 ? `${golden ? 'GOLDEN · ' : ''}${combo} COMBO · ×${multiplier}` : '';
  }

  updatePowerup(remaining, duration) {
    this.elements.powerup.classList.toggle('hidden', remaining <= 0);
    const bar = this.elements.powerup.querySelector('i');
    bar.style.transform = `scaleX(${Math.max(0, remaining / duration)})`;
  }

  toast(message, duration = 2400) {
    window.clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.classList.add('show');
    this.toastTimer = window.setTimeout(() => this.elements.toast.classList.remove('show'), duration);
  }

  toggleSetting(key) {
    const value = !this.storage.data.settings[key];
    this.storage.setSetting(key, value);
    this.applySettings();
    this.callbacks.setting(key, value);
  }

  toggleAllAudio() {
    const shouldEnable = !(this.storage.data.settings.sound || this.storage.data.settings.music);
    this.storage.setSetting('sound', shouldEnable);
    this.storage.setSetting('music', shouldEnable);
    this.applySettings();
    this.callbacks.setting('sound', shouldEnable);
    this.callbacks.setting('music', shouldEnable);
  }

  applySettings() {
    const settings = this.storage.data.settings;
    this.elements.sound.classList.toggle('on', settings.sound);
    this.elements.music.classList.toggle('on', settings.music);
    this.elements.dark.classList.toggle('on', settings.dark);
    this.elements.motion.classList.toggle('on', settings.reducedMotion);
    this.elements.sound.setAttribute('aria-checked', String(settings.sound));
    this.elements.music.setAttribute('aria-checked', String(settings.music));
    this.elements.dark.setAttribute('aria-checked', String(settings.dark));
    this.elements.motion.setAttribute('aria-checked', String(settings.reducedMotion));
    document.body.classList.toggle('dark-ui', settings.dark);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    this.elements.mute.textContent = settings.sound || settings.music ? '♪' : '×';
    this.elements.mute.setAttribute('aria-label', settings.sound || settings.music ? 'Mute audio' : 'Unmute audio');
  }

  renderMenu() {
    const target = this.storage.getDailyTarget();
    const daily = this.storage.data.daily;
    byId('dailyText').textContent = daily.complete ? 'Challenge complete' : `Score ${target} points`;
    byId('dailyProgress').textContent = daily.complete ? 'COMPLETE' : `${Math.min(target, daily.best)} / ${target}`;
    byId('dailyProgress').classList.toggle('complete', daily.complete);
  }

  renderSettings() {
    const grid = byId('skinGrid');
    grid.innerHTML = '';
    SKINS.forEach(skin => {
      const unlocked = this.storage.isSkinUnlocked(skin.id);
      const button = document.createElement('button');
      button.className = `skin-card${this.storage.data.selectedSkin === skin.id ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
      button.style.setProperty('--skin', skin.color);
      button.innerHTML = `<i class="skin-swatch"></i><strong>${skin.name}</strong><small>${unlocked ? 'AVAILABLE' : `BEST ${skin.unlock}`}</small>`;
      button.addEventListener('click', () => {
        if (this.storage.setSkin(skin.id)) {
          this.callbacks.skin(skin.id);
          this.renderSettings();
        } else this.toast(`Reach a best score of ${skin.unlock} to unlock ${skin.name}`);
      });
      grid.append(button);
    });
  }

  renderScores() {
    byId('highScoreLarge').textContent = this.storage.data.highScore;
    const history = byId('scoreHistory');
    const scores = this.storage.data.recentScores;
    history.innerHTML = scores.length ? scores.map((entry, index) => `<div class="history-row"><span>${index === 0 ? 'Latest flight' : new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><strong>${entry.score}</strong></div>`).join('') : '<div class="history-row"><span>No flights recorded yet</span><strong>—</strong></div>';
  }

  renderStats() {
    const stats = this.storage.data.stats;
    const values = [
      ['BEST', this.storage.data.highScore, 'HIGH SCORE'],
      ['FLIGHTS', stats.games, 'GAMES PLAYED'],
      ['PIPES', stats.pipes, 'CLEARED'],
      ['COMBO', stats.longestCombo, 'LONGEST CHAIN'],
      ['FLAPS', stats.flaps, 'TOTAL INPUTS'],
      ['GOLD', stats.golden, 'GOLDEN PIPES'],
      ['ORBS', stats.powerups, 'TIME BENDS'],
      ['TIME', this.formatTime(stats.playTime), 'AIRBORNE']
    ];
    byId('statsGrid').innerHTML = values.map(([icon, value, label]) => `<article class="stat-card"><b>${icon}</b><strong>${value}</strong><span>${label}</span></article>`).join('');
  }

  renderAchievements() {
    const unlocked = this.storage.data.achievements;
    byId('achievementList').innerHTML = ACHIEVEMENTS.map(item => {
      const complete = unlocked.includes(item.id);
      return `<article class="achievement${complete ? '' : ' locked'}"><div class="achievement-icon">${item.icon}</div><div><strong>${item.title}</strong><span>${item.description}</span></div><em>${complete ? '✓' : '◇'}</em></article>`;
    }).join('');
  }

  formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
}
