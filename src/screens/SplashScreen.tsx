import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { theme } from '../ui/theme';
import { type BackendStatus, probeBackend } from '../api/health';

export function SplashScreen() {
  const { state, ready } = useStore();
  const { navigate } = useNav();
  const [backend, setBackend] = useState<BackendStatus>({ kind: 'connecting' });

  useEffect(() => {
    let mounted = true;
    probeBackend().then((s) => {
      if (mounted) setBackend(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!state.parent) return; // wait for tap-to-start so parent reads disclosure
  }, [ready, state]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🌙✨📖</Text>
        <Text style={styles.title}>Bedtime Storybook Companion</Text>
        <Text style={styles.subtitle}>The conversation is the sanctuary. The storybook is the bridge.</Text>
      </View>
      <BackendBanner status={backend} />
      <Card style={styles.disclosure}>
        <Text style={styles.h2}>For the grown-up first</Text>
        <Text style={styles.body}>
          This space is private for your child. Conversation transcripts and mood data are never
          shown to you. The bedtime storybook is the bridge — your child decides whether to share
          it, and with whom.
        </Text>
        <Text style={[styles.body, styles.bodySpace]}>
          One exception: if the system detects a red-zone signal — suicidal ideation, abuse, or
          imminent harm — it surfaces the storybook to you within sixty seconds with
          conversation starters and a 988 Suicide and Crisis Lifeline link. Your child will be
          told, in their persona's voice, that someone who loves them is going to help.
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

function BackendBanner({ status }: { status: BackendStatus }) {
  if (status.kind === 'disabled') {
    return (
      <View style={[styles.banner, styles.bannerLocal]}>
        <View style={[styles.dot, { backgroundColor: theme.colors.textSoft }]} />
        <Text style={styles.bannerText}>
          Local-only mode. State persists on this device. Set EXPO_PUBLIC_API_URL to connect to the API.
        </Text>
      </View>
    );
  }
  if (status.kind === 'connecting') {
    return (
      <View style={[styles.banner, styles.bannerLocal]}>
        <View style={[styles.dot, { backgroundColor: theme.colors.warning }]} />
        <Text style={styles.bannerText}>Connecting to backend…</Text>
      </View>
    );
  }
  if (status.kind === 'ok') {
    return (
      <View style={[styles.banner, styles.bannerOk]}>
        <View style={[styles.dot, { backgroundColor: '#3FA34D' }]} />
        <Text style={styles.bannerText}>Connected to {status.url}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.banner, styles.bannerErr]}>
      <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} />
      <Text style={styles.bannerText}>
        Backend at {status.url} is unreachable: {status.error}. Falling back to local-only mode.
      </Text>
    </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bannerLocal: { backgroundColor: '#F4EFE6', borderColor: theme.colors.border },
  bannerOk: { backgroundColor: '#E8F5EA', borderColor: '#B7DFB9' },
  bannerErr: { backgroundColor: '#FBECEC', borderColor: '#F2BFBF' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bannerText: { fontSize: 13, color: theme.colors.text, flex: 1 },
});
