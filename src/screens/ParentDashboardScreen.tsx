import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { api, isApiEnabled } from '../api/client';
import { safetyAlertFromEventDTO, storybookFromDTO } from '../api/mappers';

export function ParentDashboardScreen() {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();

  // Refresh from server on mount when API is enabled. Safety events and
  // storybooks both: the dashboard is the parent's only window into the
  // sanctuary, so it needs to be current.
  useEffect(() => {
    if (!isApiEnabled()) return;
    let mounted = true;
    (async () => {
      try {
        const [events, books] = await Promise.all([
          api.listSafetyEvents(),
          api.listStorybooks(),
        ]);
        if (!mounted) return;
        dispatch({ type: 'setSafetyAlerts', alerts: events.map(safetyAlertFromEventDTO) });
        dispatch({ type: 'setStorybooks', storybooks: books.map(storybookFromDTO) });
      } catch {
        // Non-fatal; the locally-cached view stays.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const sharedToParent = state.storybooks.filter((b) =>
    b.sharedWith.some((id) => state.trustedCircle.find((m) => m.id === id)?.relationship.toLowerCase().match(/mom|dad|parent/))
  );

  const safetyAlerts = state.pendingSafetyAlerts;

  return (
    <Screen>
      <Text style={styles.title}>Parent dashboard</Text>
      <Text style={styles.subtitle}>
        What you see here is what your child has chosen to share with you — plus any
        severe-danger safety alerts that broke privacy by design.
      </Text>

      {safetyAlerts.length > 0 ? (
        <Card style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ Red-zone safety alerts</Text>
          {safetyAlerts.map((a) => {
            const book = state.storybooks.find((b) => b.id === a.storybookId);
            return (
              <View key={a.id} style={{ marginTop: 10 }}>
                <Text style={styles.alertReason}>
                  {a.signal.reason ?? 'severe-danger threshold'}
                </Text>
                <Text style={styles.alertSub}>
                  A red-zone signal fired in tonight's session, so this storybook was surfaced to
                  you without your child's consent. Your child has been told, in their persona's
                  voice and in age-appropriate language, that someone who loves them is going to
                  help.
                </Text>
                <View style={styles.starters}>
                  {a.conversationStarters.map((s, i) => (
                    <Text key={i} style={styles.starter}>
                      • {s}
                    </Text>
                  ))}
                </View>
                <View style={styles.crisis}>
                  <Text style={styles.crisisLabel}>Crisis resources</Text>
                  <Pressable onPress={() => Linking.openURL('tel:988')}>
                    <Text style={styles.crisisLink}>Call 988 — Suicide and Crisis Lifeline</Text>
                  </Pressable>
                  <Pressable onPress={() => Linking.openURL('https://988lifeline.org/chat/')}>
                    <Text style={styles.crisisLink}>Chat with 988 online</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {book ? (
                    <Pressable onPress={() => navigate({ name: 'storybook', storybookId: book.id })}>
                      <Text style={styles.link}>Read the storybook</Text>
                    </Pressable>
                  ) : null}
                  {!a.acknowledgedAt ? (
                    <Pressable
                      onPress={async () => {
                        if (isApiEnabled()) {
                          try {
                            const updated = await api.acknowledgeSafetyEvent(a.id);
                            dispatch({
                              type: 'setSafetyAlerts',
                              alerts: state.pendingSafetyAlerts.map((x) =>
                                x.id === a.id ? safetyAlertFromEventDTO(updated) : x,
                              ),
                            });
                            return;
                          } catch {
                            // Fall through to local-only acknowledge so the
                            // parent doesn't get stuck if the server is down.
                          }
                        }
                        dispatch({ type: 'acknowledgeSafetyAlert', id: a.id });
                      }}
                    >
                      <Text style={styles.link}>Acknowledge</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.muted}>Acknowledged</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.h2}>Storybooks shared with you</Text>
        {sharedToParent.length === 0 ? (
          <Text style={styles.muted}>Nothing yet. Your child decides what gets shared.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {sharedToParent.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => navigate({ name: 'storybook', storybookId: b.id })}
                style={styles.row}
              >
                <Text style={styles.rowEmoji}>{b.pages[0]?.illustrationEmoji ?? '📖'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{b.title}</Text>
                  <Text style={styles.muted}>{new Date(b.createdAt).toLocaleString()}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <View style={{ height: 12 }} />
      <Button label="Edit setup" variant="ghost" onPress={() => navigate({ name: 'parentSetup' })} />
      <View style={{ height: 8 }} />
      <Button label="Hand back to child" onPress={() => navigate({ name: 'home' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSoft, marginBottom: 12 },
  alertCard: { borderColor: theme.colors.danger, backgroundColor: '#FFF5F5', marginBottom: 12 },
  alertTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.danger },
  alertReason: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  alertSub: { fontSize: 13, color: theme.colors.textSoft, marginTop: 4 },
  starters: { marginTop: 8, gap: 6 },
  starter: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  crisis: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFEFE0',
    borderWidth: 1,
    borderColor: '#F2C39A',
    gap: 4,
  },
  crisisLabel: { fontSize: 12, fontWeight: '700', color: '#7A4F00', textTransform: 'uppercase' },
  crisisLink: { fontSize: 15, fontWeight: '600', color: theme.colors.danger },
  h2: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowEmoji: { fontSize: 32 },
  rowName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  muted: { fontSize: 13, color: theme.colors.textSoft, fontStyle: 'italic' },
  link: { color: theme.colors.primaryDark, fontWeight: '600' },
});
