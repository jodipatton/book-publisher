import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { api, isApiEnabled } from '../api/client';
import { storybookFromDTO } from '../api/mappers';

export function ShareScreen({ storybookId }: { storybookId: string }) {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();
  const book = state.storybooks.find((b) => b.id === storybookId);
  const initial = useMemo(() => new Set(book?.sharedWith ?? []), [book]);
  const [picked, setPicked] = useState<Set<string>>(initial);

  if (!book) {
    return (
      <Screen>
        <Text style={styles.title}>Storybook not found.</Text>
        <Button label="Back home" onPress={() => navigate({ name: 'home' })} />
      </Screen>
    );
  }

  const toggle = (id: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setError(null);
    const sharedWith = Array.from(picked);

    if (isApiEnabled()) {
      setSaving(true);
      try {
        const dto = await api.shareStorybook(book.id, sharedWith);
        dispatch({ type: 'updateStorybook', storybook: storybookFromDTO(dto) });
        navigate({ name: 'library' });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
      return;
    }

    dispatch({
      type: 'updateStorybook',
      storybook: { ...book, sharedWith },
    });
    navigate({ name: 'library' });
  };

  return (
    <Screen>
      <Text style={styles.title}>Who do you want to share with?</Text>
      <Text style={styles.subtitle}>You are in charge. Pick anyone, no one, or just one person.</Text>

      {state.trustedCircle.length === 0 ? (
        <Card>
          <Text style={styles.muted}>
            No one is in your trusted circle yet. Ask your grown-up to add people during setup.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {state.trustedCircle.map((m) => {
            const active = picked.has(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggle(m.id)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={[styles.checkbox, active && styles.checkboxOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.displayName}</Text>
                  <Text style={styles.rel}>{m.relationship}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: 16 }} />
      {error ? <Text style={styles.errText}>Couldn't save: {error}</Text> : null}
      <Button
        label={saving ? 'Saving…' : 'Save sharing choices'}
        onPress={onSave}
        disabled={saving}
      />
      <View style={{ height: 8 }} />
      <Button label="Keep this one private" variant="ghost" onPress={() => { setPicked(new Set()); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSoft, marginBottom: 16 },
  muted: { fontSize: 14, color: theme.colors.textSoft, fontStyle: 'italic' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  rowActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '22' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.primary },
  checkboxOn: { backgroundColor: theme.colors.primary },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  rel: { fontSize: 13, color: theme.colors.textSoft },
  errText: { color: theme.colors.danger, fontSize: 13, marginBottom: 8 },
});
