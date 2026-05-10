import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { getPersona } from '../personas';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { getAIProvider } from '../ai/provider';
import { classifyTextForSafety, generateConversationStarters, maxZone } from '../safety';
import type { Mood, SafetyAlert, SafetyZone, Storybook, Turn } from '../types';
import { api, isApiEnabled } from '../api/client';
import { safetyAlertFromEventDTO, storybookFromDTO } from '../api/mappers';

const localId = () => Math.random().toString(36).slice(2, 10);

export function ConversationScreen({ mood }: { mood: string }) {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();
  const persona = getPersona(state.child?.personaId ?? 'dog');
  const child = state.child!;
  const ai = useMemo(() => getAIProvider(), []);
  const useApi = isApiEnabled();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [companionThinking, setCompanionThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [highestZone, setHighestZone] = useState<SafetyZone>('green');
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // Session bootstrap. In API mode we POST /v1/sessions and pull back the
  // companion opener turn the server creates. In local-only mode we ask
  // the local stub for an opener instead.
  useEffect(() => {
    let mounted = true;
    setCompanionThinking(true);
    setError(null);

    (async () => {
      try {
        if (useApi) {
          const session = await api.createSession({
            child_id: child.id,
            persona_id: persona.id,
            mood: mood as Mood,
          });
          if (!mounted) return;
          setServerSessionId(session.id);
          setTurns(
            session.turns.map((t) => ({
              id: t.id,
              speaker: t.speaker,
              text: t.text,
              createdAt: Date.parse(t.created_at),
            })),
          );
        } else {
          const text = await ai.companionReply({
            persona,
            child,
            mood: mood as Mood,
            history: [],
            latestChildText: '',
          });
          if (!mounted) return;
          setTurns([{ id: localId(), speaker: 'companion', text, createdAt: Date.now() }]);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setCompanionThinking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ai, child, persona, mood, useApi]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || companionThinking) return;
    setError(null);

    if (useApi) {
      if (!serverSessionId) {
        setError('Session is not ready yet.');
        return;
      }
      // Optimistically render the child turn while the server thinks.
      const optimistic: Turn = {
        id: 'pending-' + localId(),
        speaker: 'child',
        text,
        createdAt: Date.now(),
      };
      setTurns((cur) => [...cur, optimistic]);
      setInput('');
      setCompanionThinking(true);
      try {
        const reply = await api.appendTurn(serverSessionId, text);
        // Replace the optimistic turn with the server's authoritative pair.
        setTurns((cur) => [
          ...cur.filter((t) => t.id !== optimistic.id),
          {
            id: reply.child_turn.id,
            speaker: 'child',
            text: reply.child_turn.text,
            createdAt: Date.parse(reply.child_turn.created_at),
          },
          {
            id: reply.companion_turn.id,
            speaker: 'companion',
            text: reply.companion_turn.text,
            createdAt: Date.parse(reply.companion_turn.created_at),
          },
        ]);
        setHighestZone((h) => maxZone(h, reply.safety_zone));
        // If the server fired a red-zone event, refresh safety alerts so
        // the parent dashboard surfaces it immediately.
        if (reply.safety_zone === 'red') {
          try {
            const events = await api.listSafetyEvents();
            dispatch({ type: 'setSafetyAlerts', alerts: events.map(safetyAlertFromEventDTO) });
          } catch {
            // Non-fatal; the dashboard refetches on its own mount too.
          }
        }
      } catch (e) {
        // Roll back the optimistic turn on failure.
        setTurns((cur) => cur.filter((t) => t.id !== optimistic.id));
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setCompanionThinking(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
      return;
    }

    // ---- Local-only path (unchanged) ----
    const childTurn: Turn = { id: localId(), speaker: 'child', text, createdAt: Date.now() };
    const signal = classifyTextForSafety(text);
    const becameRed = signal.zone === 'red';
    setHighestZone((h) => maxZone(h, signal.zone));

    const next = [...turns, childTurn];
    setTurns(next);
    setInput('');
    setCompanionThinking(true);

    const personaReply = becameRed
      ? `${persona.emoji} ${child.displayName}, what you said matters a lot. I am going to make sure someone who loves you knows, so they can help. You are not in trouble. I am right here.`
      : await ai.companionReply({
          persona,
          child,
          mood: mood as Mood,
          history: next,
          latestChildText: text,
        });

    setTurns((cur) => [
      ...cur,
      { id: localId(), speaker: 'companion', text: personaReply, createdAt: Date.now() },
    ]);
    setCompanionThinking(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const onMakeStory = async () => {
    setGenerating(true);
    setError(null);

    if (useApi) {
      if (!serverSessionId) {
        setError('Session is not ready yet.');
        setGenerating(false);
        return;
      }
      try {
        const dto = await api.generateStorybook(serverSessionId);
        const book = storybookFromDTO(dto);
        dispatch({ type: 'addStorybook', storybook: book });
        // Re-pull safety events; if the transcript-wide pass on the server
        // raised a red-zone, it lives there.
        try {
          const events = await api.listSafetyEvents();
          dispatch({ type: 'setSafetyAlerts', alerts: events.map(safetyAlertFromEventDTO) });
        } catch {
          // Non-fatal.
        }
        // Pull back the child profile so consecutive_amber_sessions
        // reflects what the server just updated.
        try {
          const refreshed = await api.listChildren();
          if (refreshed.length > 0) {
            const c = refreshed.find((x) => x.id === child.id) ?? refreshed[0];
            dispatch({
              type: 'setChild',
              child: {
                id: c.id,
                displayName: c.display_name,
                ageYears: c.age_years,
                personaId: child.personaId,
                readingLevel: c.reading_level,
                sessionTimeLimitMinutes: c.session_time_limit_minutes ?? undefined,
                consecutiveAmberSessions: c.consecutive_amber_sessions,
              },
            });
          }
        } catch {
          // Non-fatal.
        }
        navigate({ name: 'storybook', storybookId: book.id, justCreated: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setGenerating(false);
      }
      return;
    }

    // ---- Local-only path (unchanged) ----
    const draft = await ai.generateStorybook({ persona, child, mood: mood as Mood, turns });
    const transcript = turns.filter((t) => t.speaker === 'child').map((t) => t.text).join(' \n ');
    const finalSignal = classifyTextForSafety(transcript);
    const overallZone = maxZone(highestZone, finalSignal.zone);

    const book: Storybook = {
      id: localId(),
      title: draft.title,
      pages: draft.pages,
      createdAt: Date.now(),
      personaId: persona.id,
      mood: mood as Mood,
      childAuthorName: child.displayName,
      sharedWith: [],
      safetyOverride: overallZone === 'red' ? finalSignal : undefined,
    };
    dispatch({ type: 'addStorybook', storybook: book });

    if (overallZone === 'red') {
      const alert: SafetyAlert = {
        id: localId(),
        storybookId: book.id,
        signal: finalSignal,
        createdAt: Date.now(),
        conversationStarters: generateConversationStarters(
          finalSignal.reason ?? '',
          child.displayName,
        ),
      };
      dispatch({ type: 'addSafetyAlert', alert });
    }

    const prev = child.consecutiveAmberSessions ?? 0;
    const nextAmberCount =
      overallZone === 'amber' ? prev + 1 : overallZone === 'green' ? 0 : prev;
    if (nextAmberCount !== prev) {
      dispatch({
        type: 'setChild',
        child: { ...child, consecutiveAmberSessions: nextAmberCount },
      });
    }

    setGenerating(false);
    navigate({ name: 'storybook', storybookId: book.id, justCreated: true });
  };

  const childTurnCount = turns.filter((t) => t.speaker === 'child').length;
  const canMakeStory = childTurnCount >= 2 && !companionThinking && !generating;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>
          {persona.emoji} {persona.displayName}
        </Text>
        <Text style={styles.subtitle}>This is your private space. Talk as much as you want.</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptInner}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {turns.map((t) => (
          <View
            key={t.id}
            style={[styles.bubble, t.speaker === 'child' ? styles.childBubble : styles.companionBubble]}
          >
            <Text style={[styles.bubbleText, t.speaker === 'child' && styles.childBubbleText]}>
              {t.text}
            </Text>
          </View>
        ))}
        {companionThinking ? (
          <View style={[styles.bubble, styles.companionBubble]}>
            <ActivityIndicator />
          </View>
        ) : null}
      </ScrollView>

      {error ? <Text style={styles.errText}>Couldn't reach companion: {error}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholder="Type or tap a feeling…"
          multiline
          editable={!generating}
        />
        <Button label="Send" onPress={onSend} disabled={!input.trim() || companionThinking || generating} />
      </View>

      <View style={{ marginTop: 12, gap: 8 }}>
        <Button
          label={generating ? 'Making your storybook…' : "We're done. Make my storybook"}
          onPress={onMakeStory}
          disabled={!canMakeStory}
        />
        <Button label="Bring a grown-up in" variant="ghost" onPress={() => {}} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSoft, marginTop: 4, textAlign: 'center' },
  transcript: { width: '100%', maxHeight: 420, marginTop: 12 },
  transcriptInner: { gap: 10, paddingBottom: 8 },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '90%' },
  companionBubble: { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1, alignSelf: 'flex-start' },
  childBubble: { backgroundColor: theme.colors.primary, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 16, lineHeight: 22, color: theme.colors.text },
  childBubbleText: { color: '#1F1F1F' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errText: { color: theme.colors.danger, fontSize: 13, marginTop: 8 },
});
