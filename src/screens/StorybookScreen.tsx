import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';
import { getPersona } from '../personas';
import { Scene } from '../illustrations/Scene';
import { StorybookFrame } from '../illustrations/StorybookFrame';
import { composeScene, toneFromMood } from '../illustrations/scene';

export function StorybookScreen({ storybookId, justCreated }: { storybookId: string; justCreated?: boolean }) {
  const { state } = useStore();
  const { navigate } = useNav();
  const book = state.storybooks.find((b) => b.id === storybookId);
  const [page, setPage] = useState(0);

  const persona = useMemo(
    () => (book ? getPersona(book.personaId) : getPersona('dog')),
    [book],
  );
  const tone = useMemo(() => (book ? toneFromMood(book.mood) : 'mixed'), [book]);

  if (!book) {
    return (
      <Screen>
        <Text style={styles.title}>This storybook is no longer here.</Text>
        <Button label="Back home" onPress={() => navigate({ name: 'home' })} />
      </Screen>
    );
  }

  const p = book.pages[page];
  const isLast = page === book.pages.length - 1;
  const scene = composeScene({
    tone,
    pageIndex: page,
    pageCount: book.pages.length,
    personaId: book.personaId,
    personaEmoji: persona.emoji,
    imagePrompt: p.imagePrompt + ' ' + p.text,
  });

  return (
    <Screen>
      {justCreated ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Your storybook is ready. ✨</Text>
        </View>
      ) : null}

      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>By {book.childAuthorName}</Text>

      <StorybookFrame pageNumber={page + 1} pageCount={book.pages.length}>
        <Scene scene={scene} height={260} />
        <View style={styles.textBlock}>
          <Text style={styles.pageText}>{p.text}</Text>
        </View>
      </StorybookFrame>

      <View style={styles.controls}>
        <Pressable onPress={() => setPage((x) => Math.max(0, x - 1))} disabled={page === 0}>
          <Text style={[styles.nav, page === 0 && styles.navDisabled]}>‹ Back</Text>
        </Pressable>
        <Pressable onPress={() => setPage((x) => Math.min(book.pages.length - 1, x + 1))} disabled={isLast}>
          <Text style={[styles.nav, isLast && styles.navDisabled]}>Next ›</Text>
        </Pressable>
      </View>

      <View style={{ height: 16 }} />
      <View style={{ gap: 8 }}>
        <Button label="Share this storybook" onPress={() => navigate({ name: 'share', storybookId: book.id })} />
        <Button label="Keep it private" variant="ghost" onPress={() => navigate({ name: 'home' })} />
        <Button label="My library" variant="ghost" onPress={() => navigate({ name: 'library' })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFE4B5',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  bannerText: { color: '#7A4F00', fontWeight: '600' },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.text,
  },
  author: {
    fontSize: 14,
    fontFamily: theme.fonts.bodyItalic,
    fontStyle: 'italic',
    color: theme.colors.textSoft,
    textAlign: 'center',
    marginBottom: 12,
  },
  textBlock: {
    paddingTop: 14,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  pageText: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: theme.fonts.body,
    color: '#3B2D14',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  nav: { fontSize: 18, color: theme.colors.primaryDark, fontWeight: '600', padding: 8 },
  navDisabled: { color: theme.colors.border },
});
