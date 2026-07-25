import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '../lib/session';
import { theme } from '../constants/theme';

const { colors } = theme;

export default function RootLayout() {
  const { isLoading, isAuthenticated, restoreSession } = useSession();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="index" />
        )}
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});