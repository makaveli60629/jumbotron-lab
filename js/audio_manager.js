// js/audio_manager.js
// Simple, low-latency SFX manager for browsers + Quest.
// Uses HTMLAudio elements with preload + restart-on-play.

export const AudioManager = {
  path: 'assets/sounds/',
  library: {
    dealTwo: 'card_deal_2.mp3',
    vacuum: 'chips_vacuum.mp3',
    stack: 'chips_stack_stick.mp3',
    knock: 'hand_knock_check.mp3',
    slide: 'card_slide_vacuum.mp3'
  },
  _cache: new Map(),
  _unlocked: false,

  unlock() {
    // iOS/Quest/browser policies: must be called from a user gesture.
    this._unlocked = true;
    // Preload all.
    Object.keys(this.library).forEach(k => this._get(k));
    // Prime one sound quietly (some browsers need a play).
    const a = this._get('dealTwo');
    if (a) {
      const oldVol = a.volume;
      a.volume = 0.0001;
      a.currentTime = 0;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = oldVol;
      }).catch(() => {
        a.volume = oldVol;
      });
    }
  },

  _get(effect) {
    const file = this.library[effect];
    if (!file) return null;
    if (!this._cache.has(effect)) {
      const a = new Audio(this.path + file);
      a.preload = 'auto';
      // Match your intent: vacuum louder.
      a.volume = (effect === 'vacuum') ? 1.0 : 0.6;
      this._cache.set(effect, a);
    }
    return this._cache.get(effect);
  },

  play(effect) {
    if (!this._unlocked) return; // prevent silent failures before user gesture
    const a = this._get(effect);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (e) {}
  }
};
