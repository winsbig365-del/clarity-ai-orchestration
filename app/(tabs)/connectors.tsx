import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Plus, Trash2, ToggleLeft, ToggleRight, Key, Globe, Zap } from 'lucide-react-native';
import { Screen, Text, Button, EmptyState, Card, Input } from '../../components';
import { useSession } from '../../lib/session';
import {
  getConnectorsByUser,
  createConnector,
  toggleConnector,
  deleteConnector,
  updateConnectorConfig,
} from '../../services/queries';
import { testConnector } from '../../services/ai';
import type { Connector } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

const DEFAULT_CONNECTORS = [
  { name: 'OpenAI', type: 'rest' as const, config: { api_key: '', endpoint: 'https://api.openai.com/v1' } },
  { name: 'Godmode.ai', type: 'rest' as const, config: { api_key: '', endpoint: 'https://api.godmode.ai/v1' } },
];

export default function ConnectorsScreen() {
  const { user } = useSession();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadConnectors = useCallback(async () => {
    if (!user) return;
    let items = await getConnectorsByUser(user.id);

    if (items.length === 0) {
      for (const dc of DEFAULT_CONNECTORS) {
        const created = await createConnector(user.id, dc.name, dc.type, dc.config);
        items.push(created);
      }
    }

    setConnectors(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const handleToggle = async (id: string) => {
    await toggleConnector(id);
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Connector', 'This will remove the connector and its API key. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConnector(id);
          setConnectors((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  const handleSaveApiKey = async () => {
    if (!editingId) return;
    const connector = connectors.find((c) => c.id === editingId);
    if (!connector) return;
    const config = JSON.parse(connector.config || '{}');
    config.api_key = apiKey.trim();
    await updateConnectorConfig(editingId, config);
    setConnectors((prev) =>
      prev.map((c) => (c.id === editingId ? { ...c, config: JSON.stringify(config) } : c))
    );
    setEditingId(null);
    setApiKey('');
  };

  const handleTest = async (connector: Connector) => {
    setTestingId(connector.id);
    try {
      const result = await testConnector(connector);
      Alert.alert(
        result.success ? 'Connection Successful' : 'Connection Failed',
        result.message,
      );
    } catch (err: any) {
      Alert.alert('Test Error', err.message || 'Could not test the connection.');
    } finally {
      setTestingId(null);
    }
  };

  const getConfigSummary = (configJson: string): string => {
    try {
      const config = JSON.parse(configJson);
      if (config.api_key) return 'API key configured';
      return 'No API key set';
    } catch {
      return 'Invalid config';
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading connectors...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" color="primary">Connectors</Text>
        <Text variant="caption" color="tertiary">{connectors.length} configured</Text>
      </View>

      <FlatList
        data={connectors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="" title="No connectors" description="Add OpenAI or Godmode.ai API keys to enable AI features." />
        }
        renderItem={({ item }) => {
          const config = JSON.parse(item.config || '{}');
          const hasKey = !!config.api_key;

          return (
            <Card style={styles.connectorCard}>
              <View style={styles.connectorHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={[styles.iconBox, { backgroundColor: item.active ? colors.accentSoft : colors.surfaceAlt }]}>
                    <Globe size={18} color={item.active ? colors.accent : colors.textTertiary} strokeWidth={2} />
                  </View>
                  <View>
                    <Text variant="callout" color="primary">{item.name}</Text>
                    <Text variant="footnote" color="tertiary">{getConfigSummary(item.config)}</Text>
                  </View>
                </View>
                <Pressable onPress={() => handleToggle(item.id)}>
                  {item.active ? (
                    <ToggleRight size={28} color={colors.success} strokeWidth={2} />
                  ) : (
                    <ToggleLeft size={28} color={colors.textTertiary} strokeWidth={2} />
                  )}
                </Pressable>
              </View>

              <View style={styles.connectorActions}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable
                    onPress={() => handleTest(item)}
                    disabled={testingId === item.id}
                    style={styles.actionButton}
                  >
                    <Zap size={14} color={testingId === item.id ? colors.textTertiary : colors.success} strokeWidth={2} />
                    <Text variant="footnote" color={testingId === item.id ? 'tertiary' : 'success'}>
                      {testingId === item.id ? 'Testing...' : 'Test'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingId(item.id);
                      setApiKey(config.api_key || '');
                    }}
                    style={styles.actionButton}
                  >
                    <Key size={14} color={colors.accent} strokeWidth={2} />
                    <Text variant="footnote" color="accent">
                      {hasKey ? 'Update Key' : 'Set Key'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                    <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* API Key Modal */}
      <Modal visible={!!editingId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="heading" color="primary">API Key</Text>
            <Text variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
              Enter your API key for this connector. It is stored locally in the encrypted database.
            </Text>

            <TextInput
              placeholder="sk-..."
              placeholderTextColor={colors.textTertiary}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              style={styles.apiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => { setEditingId(null); setApiKey(''); }} variant="secondary" size="sm" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Save" onPress={handleSaveApiKey} size="sm" disabled={!apiKey.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  connectorCard: {
    gap: spacing.md,
  },
  connectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorActions: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiKeyInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});