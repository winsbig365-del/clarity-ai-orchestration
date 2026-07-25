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
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Play,
  Braces,
  Globe,
  Lock,
} from 'lucide-react-native';
import { Screen, Text, Button, EmptyState, Card, Input } from '../components';
import { useSession } from '../lib/session';
import {
  getPromptTemplatesByUser,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  incrementPromptUsage,
  createConversation,
  createMessage,
} from '../services/queries';
import type { PromptTemplate } from '../types';
import { theme } from '../constants/theme';

const { colors, spacing, radius } = theme;

function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function fillTemplate(content: string, values: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
  }
  return result;
}

const SEED_TEMPLATES = [
  {
    name: 'Code Review',
    content: 'Review the following code for bugs, performance issues, and security vulnerabilities:\n\n```\n{{code}}\n```\n\nFocus on: {{focus_areas}}',
    variables: ['code', 'focus_areas'],
    isPublic: true,
  },
  {
    name: 'Meeting Summary',
    content: 'Summarize the key points from this meeting transcript. Include action items and decisions made.\n\nTranscript:\n{{transcript}}\n\nAttendees: {{attendees}}',
    variables: ['transcript', 'attendees'],
    isPublic: true,
  },
  {
    name: 'API Endpoint Builder',
    content: 'Generate a {{language}} REST API endpoint for {{resource}} with the following operations: {{operations}}. Use {{framework}} for the implementation.',
    variables: ['language', 'resource', 'operations', 'framework'],
    isPublic: true,
  },
  {
    name: 'Bug Report',
    content: 'Analyze this bug report and suggest a fix:\n\n**Title:** {{title}}\n**Environment:** {{environment}}\n**Steps to reproduce:**\n{{steps}}\n**Expected behavior:** {{expected}}\n**Actual behavior:** {{actual}}',
    variables: ['title', 'environment', 'steps', 'expected', 'actual'],
    isPublic: true,
  },
  {
    name: 'SQL Query Generator',
    content: 'Write a SQL query for {{database}} that {{task}}. Tables involved: {{tables}}. The query should handle {{edge_cases}}.',
    variables: ['database', 'task', 'tables', 'edge_cases'],
    isPublic: true,
  },
];

export default function TemplatesScreen() {
  const { user } = useSession();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [showInjector, setShowInjector] = useState(false);
  const [injectingTemplate, setInjectingTemplate] = useState<PromptTemplate | null>(null);
  const [injectValues, setInjectValues] = useState<Record<string, string>>({});

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    let items = await getPromptTemplatesByUser(user.id);

    if (items.length === 0) {
      for (const st of SEED_TEMPLATES) {
        const created = await createPromptTemplate(user.id, st.name, st.content, st.variables, st.isPublic);
        items.push(created);
      }
    }

    setTemplates(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleOpenEditor = (template?: PromptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setEditName(template.name);
      setEditContent(template.content);
      setEditIsPublic(template.is_public);
    } else {
      setEditingTemplate(null);
      setEditName('');
      setEditContent('');
      setEditIsPublic(false);
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editContent.trim() || !user) return;

    const vars = extractVariables(editContent);

    if (editingTemplate) {
      await updatePromptTemplate(editingTemplate.id, editName.trim(), editContent.trim(), vars, editIsPublic);
    } else {
      await createPromptTemplate(user.id, editName.trim(), editContent.trim(), vars, editIsPublic);
    }

    setShowEditor(false);
    await loadTemplates();
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Template', 'Remove this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePromptTemplate(id);
          setTemplates((prev) => prev.filter((t) => t.id !== id));
        },
      },
    ]);
  };

  const handleOpenInjector = (template: PromptTemplate) => {
    setInjectingTemplate(template);
    const vars = JSON.parse(template.variables || '[]');
    const initial: Record<string, string> = {};
    if (Array.isArray(vars)) {
      vars.forEach((v: string) => { initial[v] = ''; });
    }
    setInjectValues(initial);
    setShowInjector(true);
  };

  const handleUseTemplate = async () => {
    if (!injectingTemplate || !user) return;

    const filled = fillTemplate(injectingTemplate.content, injectValues);
    await incrementPromptUsage(injectingTemplate.id);

    const conv = await createConversation(user.id, injectingTemplate.name);
    await createMessage(conv.id, 'user', filled);

    setShowInjector(false);
    router.push(`/conversation/${conv.id}`);
  };

  const detectedVars = extractVariables(editContent);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading templates...</Text>
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
          <Text variant="title" color="primary">Templates</Text>
          <Text variant="caption" color="tertiary">
            {templates.length} templates
          </Text>
        </View>
        <Pressable onPress={() => handleOpenEditor()} style={styles.addButton}>
          <Plus size={20} color={colors.onAccent} strokeWidth={2.5} />
        </Pressable>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon=""
            title="No templates"
            description="Create reusable prompt templates with {{variables}} for quick injection into conversations."
          />
        }
        renderItem={({ item }) => {
          const vars = JSON.parse(item.variables || '[]');
          const varNames = Array.isArray(vars) ? vars : Object.keys(vars);

          return (
            <Card style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Braces size={16} color={colors.accent} strokeWidth={2} />
                  <Text variant="callout" color="primary">{item.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  {item.is_public ? (
                    <Globe size={12} color={colors.textTertiary} strokeWidth={2} />
                  ) : (
                    <Lock size={12} color={colors.textTertiary} strokeWidth={2} />
                  )}
                  <Text variant="footnote" color="tertiary">{item.usage_count} uses</Text>
                </View>
              </View>

              <Text variant="caption" color="secondary" numberOfLines={3} style={{ marginTop: spacing.sm }}>
                {item.content}
              </Text>

              {varNames.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                  {varNames.map((v: string) => (
                    <View key={v} style={styles.varBadge}>
                      <Text variant="footnote" color="accent">{`{${v}}`}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.templateActions}>
                <Pressable onPress={() => handleOpenInjector(item)} style={styles.actionBtn}>
                  <Play size={14} color={colors.success} strokeWidth={2.5} />
                  <Text variant="footnote" color="success">Use</Text>
                </Pressable>
                <Pressable onPress={() => handleOpenEditor(item)} style={styles.actionBtn}>
                  <Edit3 size={14} color={colors.accent} strokeWidth={2} />
                  <Text variant="footnote" color="accent">Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      {/* Editor Modal */}
      <Modal visible={showEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="heading" color="primary">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </Text>

            <TextInput
              placeholder="e.g. Code Review"
              placeholderTextColor={colors.textTertiary}
              value={editName}
              onChangeText={setEditName}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Write your prompt template...\nUse {{variable}} for dynamic values"
              placeholderTextColor={colors.textTertiary}
              value={editContent}
              onChangeText={setEditContent}
              style={[styles.modalInput, { minHeight: 120 }]}
              multiline
              textAlignVertical="top"
            />

            {detectedVars.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                <Text variant="caption" color="tertiary">Variables: </Text>
                {detectedVars.map((v) => (
                  <View key={v} style={styles.varBadge}>
                    <Text variant="footnote" color="accent">{`{${v}}`}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => setEditIsPublic(!editIsPublic)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}
            >
              {editIsPublic ? (
                <Globe size={14} color={colors.accent} strokeWidth={2} />
              ) : (
                <Lock size={14} color={colors.textTertiary} strokeWidth={2} />
              )}
              <Text variant="callout" color="primary">Public template</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setShowEditor(false)} variant="secondary" size="sm" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Save" onPress={handleSave} size="sm" disabled={!editName.trim() || !editContent.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Injector Modal */}
      <Modal visible={showInjector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="heading" color="primary">
              {injectingTemplate?.name}
            </Text>
            <Text variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
              Fill in the variables below to inject this template into a new conversation.
            </Text>

            {Object.keys(injectValues).map((key) => (
              <View key={key} style={{ marginTop: spacing.md }}>
                <Text variant="footnote" color="accent" style={{ marginBottom: spacing.xs }}>
                  {`{{${key}}}`}
                </Text>
                <TextInput
                  placeholder={`Value for ${key}`}
                  placeholderTextColor={colors.textTertiary}
                  value={injectValues[key]}
                  onChangeText={(text) => setInjectValues((prev) => ({ ...prev, [key]: text }))}
                  style={styles.modalInput}
                />
              </View>
            ))}

            {injectingTemplate && (
              <View style={{ marginTop: spacing.lg, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md }}>
                <Text variant="footnote" color="tertiary" style={{ marginBottom: spacing.xs }}>Preview</Text>
                <Text variant="caption" color="secondary" numberOfLines={8}>
                  {fillTemplate(injectingTemplate.content, injectValues)}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setShowInjector(false)} variant="secondary" size="sm" />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Start Chat"
                  onPress={handleUseTemplate}
                  size="sm"
                />
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  templateCard: {
    gap: 0,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  varBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});