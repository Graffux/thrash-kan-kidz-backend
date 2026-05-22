/**
 * Central design tokens for the Thrash Kan Kidz visual identity.
 *
 * Use these instead of inline color strings — gives us a single place to
 * iterate on the palette and ensures consistency across screens.
 *
 * Palette: toxic slime green + purple anarchy accents + rust warmth.
 */
export const THEME = {
  // Greens
  slime: '#39ff14',
  slimeBright: '#9aff5a',
  slimePale: '#c4ff8c',
  slimeDeep: '#0a8a02',
  // Purples
  anarchy: '#9c66cc',
  anarchyDeep: '#5a1e8a',
  anarchyGlow: '#c490e8',
  // Rust / warm
  rust: '#8c3c12',
  rustDeep: '#5a1e08',
  bone: '#f4e8c8',
  // Misc
  blood: '#ff3030',
  gold: '#ffd24a',
  // Backgrounds
  bgDark: '#0a0d0a',
  bgPanel: 'rgba(20, 25, 20, 0.85)',
  // Rarity-tinted glows for Featured Cards
  glowCommon: 'rgba(255, 255, 255, 0.15)',
  glowUncommon: 'rgba(57, 255, 20, 0.5)',
  glowRare: 'rgba(156, 102, 204, 0.6)',
  glowEpic: 'rgba(255, 210, 74, 0.7)',
  glowVariant: 'rgba(196, 144, 232, 0.65)',
};

export const FONTS = {
  /** Distressed metal font for headings — loaded via expo-font in _layout.tsx */
  // Display font for headers / display copy. Must match the TTF's
  // PostScript name (nameID 6) for Android lookup to succeed in production.
  metal: 'MetalMania-Regular',
  /** System fallback for body copy / inputs (better legibility) */
  body: undefined as string | undefined,
};

/** Get the glow color for a card rarity. */
export const rarityGlow = (rarity?: string): string => {
  switch ((rarity || '').toLowerCase()) {
    case 'epic': return THEME.glowEpic;
    case 'rare': return THEME.glowRare;
    case 'variant': return THEME.glowVariant;
    case 'uncommon': return THEME.glowUncommon;
    default: return THEME.glowCommon;
  }
};
