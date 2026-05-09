import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { theme } from '../ui/theme';

export function SplashScreen() {
  const { state, ready } = useStore();
  const { navigate } = useNav();

  useEffect(() => {
    if (!ready) return;
    if (!state.parent) return; // wait for tap-to-start so parent reads disclosure
  }, [ready, state]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🌙✨📖</Text>
        <Text style={styles.title}>Storytime Sanctuary</Text>
        <Text style={styles.subtitle}>A bedtime sanctuary, a storybook bridge.</Text>
      </View>
      <Card style={styles.disclosure}>
        <Text style={styles.h2}>For the grown-up first</Text>
        <Text style={styles.body}>
          This space is private for your child. The conversation stays between them and their
          companion. The bedtime storybook is the bridge they choose to share with you — or not.
        </Text>
        <Text style={[styles.body, styles.bodySpace]}>
          One important exception: if the conversation contains signals of severe danger
          (suicidal ideation, abuse, imminent harm), the system will surface that to you with
          guidance. Your child will be told this happened.
        </Text>
        <Button
          label={state.parent ? 'Continue' : 'Set up as parent'}
          onPress={() => navigate(state.parent ? { name: 'home' } : { name: 'parentSetup' })}
        />
        {state.parent ? (
          <Button
            label="Parent dashboard"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => navigate({ name: 'parentDashboard' })}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.colors.textSoft, textAlign: 'center', marginTop: 6 },
  disclosure: { gap: 6 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: theme.colors.text },
  body: { fontSize: 15, color: theme.colors.text, lineHeight: 22 },
  bodySpace: { marginTop: 8, marginBottom: 10 },
});
