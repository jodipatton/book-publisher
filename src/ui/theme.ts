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
  radius: 18,
  spacing: (n: number) => n * 8,
};

export type Theme = typeof theme;
