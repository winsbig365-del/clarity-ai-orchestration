import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Screen, Text } from '../../components';
import { useSession } from '../../lib/session';
import {
  getConversationById,
  getMessagesByConversation,
  createMessage,
  updateConversationTitle,
} from '../../services/queries';
import { sendChatMessage } from '../../services/ai';
import type { Conversation, Message } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [conv, msgs] = await Promise.all([
      getConversationById(id),
      getMessagesByConversation(id),
    ]);
    setConversation(conv);
    setMessages(msgs);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!inputText.trim() || !id || sending || !user) return;
    setSending(true);
    setError('');
    const text = inputText.trim();
    setInputText('');

    const userMsg = await createMessage(id, 'user', text);
    setMessages((prev) => [...prev, userMsg]);

    if (conversation && messages.length === 0) {
      const title = text.slice(0, 40) + (text.length > 40 ? '...' : '');
      await updateConversationTitle(id, title);
      setConversation((prev) => prev ? { ...prev, title } : null);
    }

    try {
      const response = await sendChatMessage(
        user.id,
        messages,
        text,
        conversation?.custom_prompt_override ?? undefined,
      );

      const aiMsg = await createMessage(id, 'assistant', response.content);
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg = await createMessage(
        id,
        'system',
        `Error: ${err.message || 'AI request failed. Check your connector configuration in the Connectors tab.'}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text
          variant="body"
          color={isUser ? 'onAccent' : 'primary'}
        >
          {item.content}
        </Text>
        <Text
          variant="footnote"
          color={isUser ? 'onAccent' : 'tertiary'}
          style={{ marginTop: spacing.xs, opacity: 0.7 }}
        >
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="callout" color="primary" numberOfLines={1}>
            {conversation?.title ?? 'Chat'}
          </Text>
          {conversation?.custom_prompt_override ? (
            <Text variant="footnote" color="accent" numberOfLines={1}>
              Custom prompt active
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text variant="subhead" color="tertiary" style={{ textAlign: 'center' }}>
                {conversation?.custom_prompt_override
                  ? `System prompt: ${conversation.custom_prompt_override}`
                  : 'Start a conversation — all messages are stored offline and synced when connected.'}
              </Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          {sending && (
            <View style={styles.typingBanner}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text variant="caption" color="accent">AI is thinking...</Text>
            </View>
          )}
          {error ? (
            <View style={styles.errorBanner}>
              <Text variant="caption" color="destructive" numberOfLines={2}>
                {error}
              </Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              style={styles.input}
              multiline
              maxLength={4000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && { opacity: 0.4 },
              ]}
            >
              <Send size={18} color={colors.onAccent} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  messageList: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.sm,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  typingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorBanner: {
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});