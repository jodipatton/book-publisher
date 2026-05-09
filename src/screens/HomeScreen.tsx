import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { MOODS, getPersona } from '../personas';
import { useStore } from '../state';
import { useNav } from '../navigation';

export function HomeScreen() {
  const { state } = useStore();
  const { navigate } = useNav();
  const persona = getPersona(state.child?.personaId ?? 'dog');
  const childName = state.child?.displayName ?? 'friend';

  return (
    <Screen>
      <View style={styles.greeting}>
        <Text style={styles.emoji}>{persona.emoji}</Text>
        <Text style={styles.title}>Hi {childName}.</Text>
        <Text style={styles.subtitle}>How was today?</Text>
      </View>

      <View style={styles.grid}>
        {MOODS.map((m) => (
          <Pressable
            key={m.id}
            style={styles.tile}
            onPress={() => navigate({ name: 'conversation', mood: m.id })}
            accessibilityLabel={`Today felt like ${m.label}`}
          >
            <Text style={styles.tileEmoji}>{m.emoji}</Text>
            <Text style={styles.tileLabel}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="My library" variant="ghost" onPress={() => navigate({ name: 'library' })} />
        <Button label="Pick a different friend" variant="ghost" onPress={() => navigate({ name: 'personaPick' })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { alignItems: 'center', marginVertical: 18 },
  emoji: { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  subtitle: { fontSize: 16, color: theme.colors.textSoft, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 },
  tile: {
    width: 160,
    height: 140,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 48 },
  tileLabel: { marginTop: 8, fontSize: 14, color: theme.colors.text, textAlign: 'center', paddingHorizontal: 6 },
  footer: { marginTop: 24, gap: 8 },
});
