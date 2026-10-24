// Light and dark palettes of SendWiseLab. A neutral working look (charcoal + teal) until the
// app has its real brand; change the colors here only.
//
// Screens read colors through the active theme:
//   const colors = useColors();                     // inside a component
//   const useStyles = makeStyles((colors) => ({ … })); const styles = useStyles();
import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

const light = {
  primary: '#0E6E6C',      // buttons, links, active tab
  primaryDark: '#09504F',
  onPrimary: '#FFFFFF',    // text/icons on primary and success backgrounds
  ink: '#1D252D',          // headers and the account card (white text on it)
  inkMuted: '#B8C2CB',     // secondary text on ink surfaces
  bg: '#F3F5F6',
  card: '#FFFFFF',
  text: '#1A2027',
  muted: '#55606B',
  border: '#D9DEE2',
  success: '#22814A',
  warning: '#A86B12',
  danger: '#B42A22',
  dangerBg: '#FBEAE8',
  info: '#2F6690',
  infoBg: '#E6EFF6',
  infoText: '#1F4766',
};

export type Colors = typeof light;

const dark: Colors = {
  primary: '#5CC8C4',
  primaryDark: '#86D9D6',
  onPrimary: '#0D1A1A',
  ink: '#1B2229',
  inkMuted: '#A9B4BE',
  bg: '#101418',
  card: '#181E24',
  text: '#E8ECEF',
  muted: '#9AA5AE',
  border: '#2A333B',
  success: '#5CC98A',
  warning: '#E0A84A',
  danger: '#F08A80',
  dangerBg: '#3A1F1C',
  info: '#7DB4DE',
  infoBg: '#17283A',
  infoText: '#C3DCF0',
};

export const palettes = { light, dark };
export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export type Theme = {
  colors: Colors;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

export const ThemeContext = createContext<Theme>({
  colors: light,
  scheme: 'light',
  preference: 'system',
  setPreference: () => {},
});

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

/** Theme-aware StyleSheet: built once per palette and cached. */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: Colors) => T
): () => T {
  const cache = new Map<Colors, T>();
  return function useStyles() {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors)) as T;
      cache.set(colors, styles);
    }
    return styles;
  };
}

// Headings use the platform's system font in a heavier weight (no display face yet).
export const fonts = { display: undefined as string | undefined };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 20 };
