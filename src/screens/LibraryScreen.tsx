import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';

export function LibraryScreen() {
  const { state } = useStore();
  const { navigate } = useNav();

  return (
    <Screen>
      <Text style={styles.title}>My library</Text>
      <Text style={styles.subtitle}>Every storybook you have ever made lives here.</Text>

      {state.storybooks.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No storybooks yet. Tap a feeling on the home screen to make one.</Text>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {state.storybooks.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => navigate({ name: 'storybook', storybookId: b.id })}
              style={styles.row}
            >
              <Text style={styles.cover}>{b.pages[0]?.illustrationEmoji ?? '📖'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.title}</Text>
                <Text style={styles.meta}>
                  {new Date(b.createdAt).toLocaleDateString()} •{' '}
                  {b.sharedWith.length > 0 ? `Shared with ${b.sharedWith.length}` : 'Private'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 16 }} />
      <Button label="Back home" variant="ghost" onPress={() => navigate({ name: 'home' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSoft, marginBottom: 12 },
  muted: { fontSize: 14, color: theme.colors.textSoft, fontStyle: 'italic' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cover: { fontSize: 40 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  meta: { fontSize: 13, color: theme.colors.textSoft, marginTop: 2 },
});
