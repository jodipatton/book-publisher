import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { theme } from '../ui/theme';
import { useStore } from '../state';
import { useNav } from '../navigation';

export function StorybookScreen({ storybookId, justCreated }: { storybookId: string; justCreated?: boolean }) {
  const { state } = useStore();
  const { navigate } = useNav();
  const book = state.storybooks.find((b) => b.id === storybookId);
  const [page, setPage] = useState(0);

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

  return (
    <Screen>
      {justCreated ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Your storybook is ready. ✨</Text>
        </View>
      ) : null}

      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>By {book.childAuthorName}</Text>

      <View style={[styles.page, { backgroundColor: p.illustrationBg }]}>
        <Text style={styles.illustration}>{p.illustrationEmoji}</Text>
        <Text style={styles.pageText}>{p.text}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => setPage((x) => Math.max(0, x - 1))} disabled={page === 0}>
          <Text style={[styles.nav, page === 0 && styles.navDisabled]}>‹ Back</Text>
        </Pressable>
        <Text style={styles.pageNum}>
          {page + 1} / {book.pages.length}
        </Text>
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
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: theme.colors.text },
  author: { fontSize: 14, color: theme.colors.textSoft, textAlign: 'center', marginBottom: 12 },
  page: {
    minHeight: 360,
    borderRadius: theme.radius,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: { fontSize: 96, marginBottom: 16 },
  pageText: { fontSize: 18, lineHeight: 26, color: theme.colors.text, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  nav: { fontSize: 18, color: theme.colors.primaryDark, fontWeight: '600', padding: 8 },
  navDisabled: { color: theme.colors.border },
  pageNum: { color: theme.colors.textSoft },
});
