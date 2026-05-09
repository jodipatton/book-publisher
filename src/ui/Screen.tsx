import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from './theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.outer}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.frame}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { flexGrow: 1, padding: 20, alignItems: 'center' },
  frame: { width: '100%', maxWidth: 760 },
});
