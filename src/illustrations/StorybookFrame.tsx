import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '../ui/theme';

interface Props {
  pageNumber: number;
  pageCount: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

// A storybook spread: warm paper card with a soft shadow, a thin inner
// border, decorative corner ornaments, and a centered page indicator
// at the bottom. Designed to feel like a printed page, not a chat card.
export function StorybookFrame({ pageNumber, pageCount, children, style }: Props) {
  return (
    <View style={[styles.outer, style]}>
      {/* Decorative corner flourishes. Tone-neutral so they read on every page. */}
      <Text style={[styles.corner, styles.cornerTL]}>❦</Text>
      <Text style={[styles.corner, styles.cornerTR]}>❦</Text>
      <Text style={[styles.corner, styles.cornerBL]}>❦</Text>
      <Text style={[styles.corner, styles.cornerBR]}>❦</Text>

      {/* Inner thin border. */}
      <View style={styles.inner}>{children}</View>

      <View style={styles.pageNumber}>
        <Text style={styles.pageNumberText}>
          {pageNumber} of {pageCount}
        </Text>
      </View>
    </View>
  );
}

const PAPER = '#FBF1DC';
const BORDER = '#D9C39A';

const styles = StyleSheet.create({
  outer: {
    backgroundColor: PAPER,
    borderRadius: 22,
    padding: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    position: 'relative',
  },
  inner: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFF7E5',
  },
  corner: {
    position: 'absolute',
    fontSize: 18,
    color: '#B6925A',
    opacity: 0.85,
  },
  cornerTL: { top: 4, left: 8 },
  cornerTR: { top: 4, right: 8, transform: [{ scaleX: -1 }] },
  cornerBL: { bottom: 18, left: 8, transform: [{ scaleY: -1 }] },
  cornerBR: { bottom: 18, right: 8, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
  pageNumber: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageNumberText: {
    fontFamily: theme.fonts?.body,
    fontSize: 11,
    color: '#9D7E4A',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
});
