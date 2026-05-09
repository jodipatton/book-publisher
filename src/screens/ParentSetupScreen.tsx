import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';
import type { TrustedCircleMember } from '../types';

const id = () => Math.random().toString(36).slice(2, 10);

export function ParentSetupScreen() {
  const { state, dispatch } = useStore();
  const { navigate } = useNav();

  const [parentName, setParentName] = useState(state.parent?.displayName ?? '');
  const [childName, setChildName] = useState(state.child?.displayName ?? '');
  const [age, setAge] = useState(String(state.child?.ageYears ?? 7));
  const [sessionLimit, setSessionLimit] = useState(
    String(state.child?.sessionTimeLimitMinutes ?? 15),
  );
  const [members, setMembers] = useState<TrustedCircleMember[]>(state.trustedCircle);
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [alerts, setAlerts] = useState(true);

  const ageNum = Math.max(5, Math.min(10, parseInt(age, 10) || 7));
  const sessionLimitNum = Math.max(5, Math.min(60, parseInt(sessionLimit, 10) || 15));

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const addMember = () => {
    if (!newName.trim() || !newRel.trim() || !isEmail(newEmail.trim())) return;
    setMembers((m) => [
      ...m,
      {
        id: id(),
        displayName: newName.trim(),
        relationship: newRel.trim(),
        email: newEmail.trim(),
        receivesSafetyAlerts: alerts,
      },
    ]);
    setNewName('');
    setNewRel('');
    setNewEmail('');
  };

  const removeMember = (mid: string) => setMembers((m) => m.filter((x) => x.id !== mid));

  const canSave = parentName.trim().length > 0 && childName.trim().length > 0;

  const onSave = () => {
    dispatch({ type: 'setParent', parent: { id: state.parent?.id ?? id(), displayName: parentName.trim() } });
    dispatch({
      type: 'setChild',
      child: {
        id: state.child?.id ?? id(),
        displayName: childName.trim(),
        ageYears: ageNum,
        personaId: state.child?.personaId ?? 'dog',
        readingLevel: state.child?.readingLevel ?? Math.min(1, (ageNum - 5) / 5),
        sessionTimeLimitMinutes: sessionLimitNum,
        consecutiveAmberSessions: state.child?.consecutiveAmberSessions ?? 0,
      },
    });
    dispatch({ type: 'setTrustedCircle', members });
    navigate(state.child?.personaId ? { name: 'home' } : { name: 'personaPick' });
  };

  return (
    <Screen>
      <Text style={styles.title}>Parent setup</Text>
      <Text style={styles.subtitle}>
        We will use these names in the storybook and the bedtime experience.
      </Text>

      <Card style={styles.section}>
        <Text style={styles.label}>Your name</Text>
        <TextInput value={parentName} onChangeText={setParentName} style={styles.input} placeholder="e.g. Jordan" />

        <Text style={styles.label}>Your child's name</Text>
        <TextInput value={childName} onChangeText={setChildName} style={styles.input} placeholder="e.g. Camille" />

        <Text style={styles.label}>Your child's age (5–10)</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={2}
        />

        <Text style={styles.label}>Session time limit (minutes, 5–60)</Text>
        <TextInput
          value={sessionLimit}
          onChangeText={setSessionLimit}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="15"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.h2}>Trusted sharing circle</Text>
        <Text style={styles.help}>
          People your child can choose to share their storybook with. You decide who is on this list.
        </Text>
        {members.length === 0 ? <Text style={styles.muted}>No one added yet.</Text> : null}
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.displayName}</Text>
              <Text style={styles.memberRel}>
                {m.relationship} • {m.email}
                {m.receivesSafetyAlerts ? ' • receives safety alerts' : ''}
              </Text>
            </View>
            <Pressable onPress={() => removeMember(m.id)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.help}>
          Each circle member is invited by email and gets a view-only account for shared
          storybooks (PRD F-15).
        </Text>
        <View style={styles.addRow}>
          <TextInput value={newName} onChangeText={setNewName} style={[styles.input, styles.flex]} placeholder="Name" />
          <TextInput value={newRel} onChangeText={setNewRel} style={[styles.input, styles.flex]} placeholder="Relationship" />
        </View>
        <TextInput
          value={newEmail}
          onChangeText={setNewEmail}
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable onPress={() => setAlerts((a) => !a)} style={styles.toggleRow}>
          <View style={[styles.checkbox, alerts && styles.checkboxOn]} />
          <Text style={styles.help}>Also receives safety alerts (only for severe-danger threshold)</Text>
        </Pressable>
        <Button label="Add to circle" variant="ghost" onPress={addMember} />
      </Card>

      <View style={{ height: 12 }} />
      <Button label={canSave ? 'Save and continue' : 'Add a name to continue'} onPress={onSave} disabled={!canSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSoft, marginBottom: 16 },
  section: { marginBottom: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSoft, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  h2: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  help: { fontSize: 13, color: theme.colors.textSoft, marginBottom: 8 },
  muted: { fontSize: 14, color: theme.colors.textSoft, fontStyle: 'italic', marginVertical: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  memberRel: { fontSize: 13, color: theme.colors.textSoft },
  remove: { color: theme.colors.danger, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.primary },
  checkboxOn: { backgroundColor: theme.colors.primary },
});
