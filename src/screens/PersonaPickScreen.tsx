import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { PERSONAS } from '../personas';
import { useStore } from '../state';
import { useNav } from '../navigation';
import type { PersonaId } from '../types';

export function PersonaPickScreen() {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();
  const [selected, setSelected] = useState<PersonaId>(state.child?.personaId ?? 'dog');

  const onConfirm = () => {
    if (!state.child) return;
    dispatch({ type: 'setChild', child: { ...state.child, personaId: selected } });
    navigate({ name: 'home' });
  };

  return (
    <Screen>
      <Text style={styles.title}>Pick a friend</Text>
      <Text style={styles.subtitle}>This friend will be with you every night. You can change them later.</Text>

      <View style={styles.grid}>
        {PERSONAS.map((p) => {
          const active = p.id === selected;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[styles.tile, active && { borderColor: p.paletteHex, borderWidth: 3, backgroundColor: p.paletteHex + '22' }]}
              accessibilityLabel={`Pick ${p.displayName}`}
            >
              <Text style={styles.emoji}>{p.emoji}</Text>
              <Text style={styles.name}>{p.displayName}</Text>
              <Text style={styles.desc}>{p.shortDescription}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 16 }} />
      <Button label="That's my friend" onPress={onConfirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 15, color: theme.colors.textSoft, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  tile: {
    width: 220,
    minHeight: 200,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  desc: { fontSize: 13, color: theme.colors.textSoft, textAlign: 'center', marginTop: 6 },
});
