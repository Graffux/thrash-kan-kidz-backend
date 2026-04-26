import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

// Sound assets
const SOUNDS = {
  pack_open: require('../../assets/sounds/pack_open.wav'),
  card_reveal: require('../../assets/sounds/card_reveal.wav'),
  wheel_spin: require('../../assets/sounds/wheel_spin.wav'),
  prize_won: require('../../assets/sounds/prize_won.wav'),
  duplicate: require('../../assets/sounds/duplicate.wav'),
  button_tap: require('../../assets/sounds/button_tap.wav'),
  login_riff: require('../../assets/sounds/login_riff.mp3'),
  card_flip: require('../../assets/sounds/card_flip.mp3'),
  axe_impact: require('../../assets/sounds/axe_impact.mp3'),
  cash_register: require('../../assets/sounds/cash_register.mp3'),
  clinking_coins: require('../../assets/sounds/clinking_coins.mp3'),
  tab_home: require('../../assets/sounds/tab_home.mp3'),
  tab_collection: require('../../assets/sounds/tab_collection.mp3'),
  tab_trade: require('../../assets/sounds/tab_trade.mp3'),
  tab_goals: require('../../assets/sounds/tab_goals.mp3'),
  collection_bg: require('../../assets/sounds/collection_bg.mp3'),
};

export type SoundName = keyof typeof SOUNDS;

/**
 * One-shot sound player. Wraps native errors so audio failures never crash the app.
 */
export function useSoundPlayer(name: SoundName) {
  const player = useAudioPlayer(SOUNDS[name]);
  return {
    play: () => {
      try {
        player.seekTo(0);
        player.play();
      } catch (_e) {
        // ignore
      }
    },
  };
}

/**
 * Looping background music. start() begins playback, stop() pauses + rewinds.
 * Volume defaulted to 0.5 so it sits behind sound effects.
 */
export function useLoopingPlayer(name: SoundName) {
  const player = useAudioPlayer(SOUNDS[name]);
  const startedRef = useRef(false);

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (_e) {
        // ignore
      }
    };
  }, [player]);

  return {
    start: () => {
      try {
        if (!startedRef.current) {
          player.loop = true;
          player.volume = 0.5;
          startedRef.current = true;
        }
        player.seekTo(0);
        player.play();
      } catch (_e) {
        // ignore
      }
    },
    stop: () => {
      try {
        player.pause();
        player.seekTo(0);
      } catch (_e) {
        // ignore
      }
    },
  };
}
