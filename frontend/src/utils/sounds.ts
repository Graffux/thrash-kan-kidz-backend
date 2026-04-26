import { useAudioPlayer } from 'expo-audio';

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
};

export type SoundName = keyof typeof SOUNDS;

export function useSoundPlayer(name: SoundName) {
  const player = useAudioPlayer(SOUNDS[name]);
  return {
    play: () => {
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {
        // Ignore sound errors - don't break app
      }
    },
  };
}
