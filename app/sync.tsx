import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  Save,
  Clock,
} from 'lucide-react-native';
import { Screen, Text, Button, Card, Divider } from '../components';
import {
  getSyncEndpoint,
  setSyncEndpoint,
  flushSyncQueue,
  getSyncLog,
  getQueueStats,
  type FlushResult,
  type SyncLogEntry,
} from '../services/sync';
import { registerSyncTask } from '../services/syncTask';
import { theme } from '../constants/theme';

const { colors, spacing, radius } = theme;

export default function SyncScreen() {
  const [endpoint, setEndpoint] = useState('');
  const [savedEndpoint, setSavedEndpoint] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState({ pending: 0, attempted: 0, total: 0 });
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [lastResult, setLastResult] = useState<FlushResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [ep, stats, log] = await Promise.all([
      getSyncEndpoint(),
      getQueueStats(),
      getSyncLog(),
    ]);
    setSavedEndpoint(ep);
    setEndpoint(ep || '');
    setQueueStats(stats);
    setSyncLog(log);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    registerSyncTask();
  }, [loadData]);

  const handleSave = async () => {
    const trimmed = endpoint.trim();
    if (trimmed) {
      await setSyncEndpoint(trimmed);
      setSavedEndpoint(trimmed);
      Alert.alert('Saved', 'Sync endpoint configured. Background sync will run every 15 minutes.');
    } else {
      Alert.alert('Error', 'Enter a valid endpoint URL.');
    }
  };

  const handleClear = async () => {
    Alert.alert('Clear Endpoint', 'Remove the sync endpoint? Background sync will stop.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await (await import('../services/sync')).clearSyncEndpoint();
          setEndpoint('');
          setSavedEndpoint(null);
        },
      },
    ]);
  };

  const handleFlush = async () => {
    if (!savedEndpoint) {
      Alert.alert('No Endpoint', 'Configure a sync endpoint first.');
      return;
    }
    setFlushing(true);
    setLastResult(null);
    try {
      const result = await flushSyncQueue();
      setLastResult(result);
      const stats = await getQueueStats();
      setQueueStats(stats);
      const log = await getSyncLog();
      setSyncLog(log);
    } catch (err: any) {
      Alert.alert('Flush Failed', err.message || 'Unknown error');
    } finally {
      setFlushing(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading sync settings...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title" color="primary">Sync Settings</Text>
          <Text variant="caption" color="tertiary">
            {savedEndpoint ? 'Endpoint configured' : 'No endpoint configured'}
          </Text>
        </View>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'sync'}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Status */}
            <Card style={styles.statusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {savedEndpoint ? (
                  <Cloud size={24} color={colors.success} strokeWidth={2} />
                ) : (
                  <CloudOff size={24} color={colors.textTertiary} strokeWidth={2} />
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="callout" color="primary">
                    {savedEndpoint ? 'Connected' : 'Not Configured'}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {savedEndpoint || 'Set up a REST endpoint to sync data'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Queue Stats */}
            <View style={styles.statsRow}>
              <StatPill label="Pending" value={queueStats.pending} color={colors.warning} />
              <StatPill label="Attempted" value={queueStats.attempted} color={colors.info} />
              <StatPill label="Total" value={queueStats.total} color={colors.accent} />
            </View>

            {/* Endpoint Input */}
            <Text variant="subhead" color="primary" style={{ marginBottom: spacing.sm }}>Endpoint URL</Text>
            <TextInput
              placeholder="https://your-api.com"
              placeholderTextColor={colors.textTertiary}
              value={endpoint}
              onChangeText={setEndpoint}
              style={styles.endpointInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button title="Save" onPress={handleSave} size="sm" />
              </View>
              {savedEndpoint ? (
                <View style={{ flex: 1 }}>
                  <Button title="Clear" onPress={handleClear} variant="ghost" size="sm" />
                </View>
              ) : null}
            </View>

            {/* Flush Button */}
            <Button
              title={flushing ? 'Flushing...' : 'Flush Queue Now'}
              onPress={handleFlush}
              loading={flushing}
              disabled={!savedEndpoint || flushing}
              size="md"
              variant="secondary"
            />

            {/* Flush Result */}
            {lastResult && (
              <Card style={{ marginTop: spacing.lg }}>
                <Text variant="subhead" color="primary">Last Flush Result</Text>
                <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
                  <View>
                    <Text variant="title" color="success">{lastResult.success}</Text>
                    <Text variant="footnote" color="tertiary">Succeeded</Text>
                  </View>
                  <View>
                    <Text variant="title" color="destructive">{lastResult.failed}</Text>
                    <Text variant="footnote" color="tertiary">Failed</Text>
                  </View>
                </View>
                {lastResult.errors.length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    {lastResult.errors.map((e, i) => (
                      <Text key={i} variant="footnote" color="destructive">
                        {e.entityType}/{e.entityId}: {e.error}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
            )}

            <Divider />

            {/* Sync History */}
            <Text variant="subhead" color="primary" style={{ marginBottom: spacing.md }}>Sync History</Text>
            {syncLog.length === 0 ? (
              <Text variant="body" color="tertiary" style={{ textAlign: 'center', padding: spacing.xl }}>
                No sync history yet. Configure an endpoint and flush the queue.
              </Text>
            ) : (
              syncLog.slice(0, 10).map((entry, i) => (
                <View key={i} style={styles.logEntry}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Clock size={12} color={colors.textTertiary} strokeWidth={2} />
                    <Text variant="footnote" color="tertiary">
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <Text variant="caption" color="success">{entry.success} ok</Text>
                    <Text variant="caption" color="destructive">{entry.failed} failed</Text>
                    <Text variant="caption" color="tertiary">{entry.total} total</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        }
        renderItem={() => null}
      />
    </Screen>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[statPillStyles.pill, { backgroundColor: color + '15' }]}>
      <Text variant="title" style={{ color }}>{value}</Text>
      <Text variant="footnote" style={{ color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing.lg,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  endpointInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const statPillStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});