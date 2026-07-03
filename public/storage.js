const STORAGE_KEY = 'skybound_save_v1';

export const SKINS = [
  { id: 'azure', name: 'Azure', color: '#5ee7ff', unlock: 0 },
  { id: 'sunset', name: 'Sunset', color: '#ff8a5c', unlock: 10 },
  { id: 'mint', name: 'Mint', color: '#62f5b0', unlock: 25 },
  { id: 'royal', name: 'Royal', color: '#9b7bff', unlock: 50 },
  { id: 'ember', name: 'Ember', color: '#ff4f73', unlock: 80 },
  { id: 'gold', name: 'Aureate', color: '#ffd45d', unlock: 120 }
];

export const ACHIEVEMENTS = [
  { id: 'first_flight', icon: '↗', title: 'First Flight', description: 'Complete your first flight.' },
  { id: 'score_10', icon: '10', title: 'Finding Rhythm', description: 'Score 10 points in one flight.' },
  { id: 'score_25', icon: '25', title: 'Cloud Surfer', description: 'Score 25 points in one flight.' },
  { id: 'score_50', icon: '50', title: 'Sky Legend', description: 'Score 50 points in one flight.' },
  { id: 'combo_10', icon: '×2', title: 'Flow State', description: 'Build a 10-pass combo.' },
  { id: 'golden_5', icon: '★', title: 'Gold Rush', description: 'Clear 5 golden pipes in total.' },
  { id: 'daily', icon: '☀', title: 'Daily Pilot', description: 'Complete a daily challenge.' },
  { id: 'games_25', icon: 'Ⅱ', title: 'Persistent', description: 'Play 25 flights.' }
];

const defaultData = () => ({
  highScore: 0,
  recentScores: [],
  settings: { sound: true, music: true, dark: true, reducedMotion: false },
  selectedSkin: 'azure',
  achievements: [],
  stats: {
    games: 0,
    totalScore: 0,
    pipes: 0,
    golden: 0,
    flaps: 0,
    longestCombo: 0,
    powerups: 0,
    playTime: 0
  },
  daily: { date: '', best: 0, complete: false }
});

export class StorageManager {
  constructor() {
    this.data = this.load();
    this.refreshDaily();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return defaultData();
      const defaults = defaultData();
      return {
        ...defaults,
        ...saved,
        settings: { ...defaults.settings, ...saved.settings },
        stats: { ...defaults.stats, ...saved.stats },
        daily: { ...defaults.daily, ...saved.daily }
      };
    } catch {
      return defaultData();
    }
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* Storage may be disabled. */ }
  }

  refreshDaily() {
    const date = new Date().toLocaleDateString('en-CA');
    if (this.data.daily.date !== date) this.data.daily = { date, best: 0, complete: false };
    this.save();
  }

  getDailyTarget() {
    const seed = [...this.data.daily.date].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return 15 + (seed % 16);
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  setSkin(id) {
    if (this.isSkinUnlocked(id)) {
      this.data.selectedSkin = id;
      this.save();
      return true;
    }
    return false;
  }

  isSkinUnlocked(id) {
    const skin = SKINS.find(item => item.id === id);
    return Boolean(skin && this.data.highScore >= skin.unlock);
  }

  unlockAchievement(id) {
    if (this.data.achievements.includes(id)) return false;
    this.data.achievements.push(id);
    this.save();
    return ACHIEVEMENTS.find(item => item.id === id) || false;
  }

  recordGame(result) {
    const stats = this.data.stats;
    const previousBest = this.data.highScore;
    stats.games += 1;
    stats.totalScore += result.score;
    stats.pipes += result.pipes;
    stats.golden += result.golden;
    stats.flaps += result.flaps;
    stats.longestCombo = Math.max(stats.longestCombo, result.combo);
    stats.powerups += result.powerups;
    stats.playTime += Math.round(result.playTime);
    this.data.highScore = Math.max(this.data.highScore, result.score);
    this.data.recentScores.unshift({ score: result.score, date: Date.now() });
    this.data.recentScores = this.data.recentScores.slice(0, 5);
    this.data.daily.best = Math.max(this.data.daily.best, result.score);
    this.data.daily.complete = this.data.daily.best >= this.getDailyTarget();

    const unlocked = [];
    const check = id => { const achievement = this.unlockAchievement(id); if (achievement) unlocked.push(achievement); };
    check('first_flight');
    if (result.score >= 10) check('score_10');
    if (result.score >= 25) check('score_25');
    if (result.score >= 50) check('score_50');
    if (result.combo >= 10) check('combo_10');
    if (stats.golden >= 5) check('golden_5');
    if (this.data.daily.complete) check('daily');
    if (stats.games >= 25) check('games_25');
    this.save();
    return { isNewBest: result.score > previousBest, unlocked };
  }
}
