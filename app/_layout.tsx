import { useEffect } from 'react';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrate } from '@/db';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida num reload — não é motivo de erro.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Baloo2_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Sem as fontes carregadas o layout mede errado e "salta" ao aparecer.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="card/[id]" />
          {/* O fluxo de prática entra de baixo, como uma sessão à parte. */}
          <Stack.Screen
            name="practice/index"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="practice/config" />
          <Stack.Screen
            name="practice/play"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="practice/results"
            options={{ gestureEnabled: false }}
          />
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
