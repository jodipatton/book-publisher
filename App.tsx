import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { StoreProvider, useStore } from './src/state';
import { NavProvider, useNav } from './src/navigation';
import { theme } from './src/ui/theme';
import { useApiHydrate } from './src/api/hydrate';

import { SplashScreen } from './src/screens/SplashScreen';
import { ParentSetupScreen } from './src/screens/ParentSetupScreen';
import { PersonaPickScreen } from './src/screens/PersonaPickScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { StorybookScreen } from './src/screens/StorybookScreen';
import { ShareScreen } from './src/screens/ShareScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ParentDashboardScreen } from './src/screens/ParentDashboardScreen';

export default function App() {
  return (
    <StoreProvider>
      <NavProvider>
        <Root />
        <StatusBar style="dark" />
      </NavProvider>
    </StoreProvider>
  );
}

function Root() {
  const { ready } = useStore();
  // Boot-time API hydration. No-op when EXPO_PUBLIC_API_URL is unset.
  const apiHydrate = useApiHydrate();

  if (!ready || apiHydrate.hydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Router />;
}

function Router() {
  const { route } = useNav();
  switch (route.name) {
    case 'splash':
      return <SplashScreen />;
    case 'parentSetup':
      return <ParentSetupScreen />;
    case 'personaPick':
      return <PersonaPickScreen />;
    case 'home':
      return <HomeScreen />;
    case 'conversation':
      return <ConversationScreen mood={route.mood} />;
    case 'storybook':
      return <StorybookScreen storybookId={route.storybookId} justCreated={route.justCreated} />;
    case 'share':
      return <ShareScreen storybookId={route.storybookId} />;
    case 'library':
      return <LibraryScreen />;
    case 'parentDashboard':
      return <ParentDashboardScreen />;
  }
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
});
