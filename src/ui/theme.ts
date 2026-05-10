export const theme = {
  colors: {
    bg: '#FFF7E8',
    card: '#FFFFFF',
    text: '#2A2A2A',
    textSoft: '#5C5C5C',
    primary: '#F4B860',
    primaryDark: '#D89740',
    accent: '#9CB4E0',
    danger: '#D9534F',
    warning: '#E0A04A',
    border: '#EADBC4',
  },
  fonts: {
    // Storybook serif. Loaded async via expo-font in App.tsx.
    // Falls back to platform serif until loaded.
    body: 'Lora_400Regular',
    bodyItalic: 'Lora_400Regular_Italic',
    bodyBold: 'Lora_700Bold',
  },
  radius: 18,
  spacing: (n: number) => n * 8,
};

export type Theme = typeof theme;
