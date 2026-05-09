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

const id = () => Math.random().toString(36).slice(2, 10);

export function ConversationScreen({ mood }: { mood: string }) {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();
  const persona = getPersona(state.child?.personaId ?? 'dog');
  const child = state.child!;
  const ai = useMemo(() => getAIProvider(), []);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [companionThinking, setCompanionThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [highestZone, setHighestZone] = useState<SafetyZone>('green');
  const scrollRef = useRef<ScrollView | null>(null);

  // Companion opener.
  useEffect(() => {
    let mounted = true;
    setCompanionThinking(true);
    ai.companionReply({
      persona,
      child,
      mood: mood as Mood,
      history: [],
      latestChildText: '',
    }).then((text) => {
      if (!mounted) return;
      setTurns([{ id: id(), speaker: 'companion', text, createdAt: Date.now() }]);
      setCompanionThinking(false);
    });
    return () => {
      mounted = false;
    };
  }, [ai, child, persona, mood]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || companionThinking) return;
    const childTurn: Turn = { id: id(), speaker: 'child', text, createdAt: Date.now() };

    const signal = classifyTextForSafety(text);
    const becameRed = signal.zone === 'red';
    setHighestZone((h) => maxZone(h, signal.zone));

    const next = [...turns, childTurn];
    setTurns(next);
    setInput('');
    setCompanionThinking(true);

    // F-10: when a red-zone signal fires, the persona tells the child in
    // age-appropriate language that someone who loves them is going to help.
    // Otherwise we use the AIProvider for a normal reply.
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
      { id: id(), speaker: 'companion', text: personaReply, createdAt: Date.now() },
    ]);
    setCompanionThinking(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const onMakeStory = async () => {
    setGenerating(true);
    const draft = await ai.generateStorybook({ persona, child, mood: mood as Mood, turns });

    // Run a final pass over the entire transcript for safety before storing.
    const transcript = turns.filter((t) => t.speaker === 'child').map((t) => t.text).join(' \n ');
    const finalSignal = classifyTextForSafety(transcript);
    const overallZone = maxZone(highestZone, finalSignal.zone);

    const book: Storybook = {
      id: id(),
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
        id: id(),
        storybookId: book.id,
        signal: finalSignal,
        createdAt: Date.now(),
        conversationStarters: generateConversationStarters(finalSignal.reason ?? '', child.displayName),
      };
      dispatch({ type: 'addSafetyAlert', alert });
    }

    // F-11: track consecutive amber sessions on the child profile.
    // Amber bumps the counter; green resets it; red is handled separately
    // via the alert path. >=5 elevates to clinical advisory review queue
    // (queue itself is not yet implemented — see README gaps).
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
});
