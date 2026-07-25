import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Button, Input } from '../components';
import { registerWithInvite } from '../services/auth';
import { useSession } from '../lib/session';
import { theme } from '../constants/theme';

const { colors, spacing, radius } = theme;

export default function InviteScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useSession();

  const handleRegister = async () => {
    setError('');
    if (!inviteCode.trim() || !email.trim()) {
      setError('Both fields are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithInvite(inviteCode.trim().toUpperCase(), email.trim().toLowerCase());
      if (result) {
        await setSession(result.token, result.user);
        router.replace('/(tabs)');
      } else {
        setError('Invalid invite code or email already registered');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <View style={styles.logoInner} />
            </View>
            <Text variant="display" color="primary" style={{ textAlign: 'center' }}>
              CLARITY
            </Text>
            <Text variant="subhead" color="secondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Offline-first AI orchestration.{'\n'}Invite-only access.
            </Text>
          </View>

          <View style={styles.form}>
            <Text variant="heading" color="primary" style={{ marginBottom: spacing.xl }}>
              Enter your invite
            </Text>

            <Input
              placeholder="CLARITY-XXXX-XXXX-XXXX"
              value={inviteCode}
              onChangeText={(t: string) => setInviteCode(t.toUpperCase())}
            />

            <Input
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text variant="callout" color="destructive">{error}</Text>
              </View>
            ) : null}

            <Button
              title="Join CLARITY"
              onPress={handleRegister}
              loading={loading}
              disabled={!inviteCode.trim() || !email.trim()}
              size="lg"
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing['3xl'],
  },
  hero: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  logoInner: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  form: {
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
});