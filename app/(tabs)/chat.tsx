import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus, MessageCircle, Trash2, Braces } from 'lucide-react-native';
import { Screen, Text, Button, EmptyState, Avatar } from '../../components';
import { useSession } from '../../lib/session';
import {
  getConversationsByUser,
  createConversation,
  deleteConversation,
  searchMessages,
  type SearchResult,
} from '../../services/queries';
import type { Conversation } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

export default function ChatScreen() {
  const { user } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const convs = await getConversationsByUser(user.id);
    setConversations(convs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const results = await searchMessages(query.trim());
    setSearchResults(results);
  };

  const handleNewChat = async () => {
    if (!user) return;
    const conv = await createConversation(user.id);
    setConversations((prev) => [conv, ...prev]);
    router.push(`/conversation/${conv.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text variant="title" color="primary">Chat</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push('/templates')}
              style={styles.templateButton}
            >
              <Braces size={18} color={colors.accent} strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={handleNewChat} style={styles.newButton}>
              <Plus size={20} color={colors.onAccent} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />
        </View>

        {isSearching ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.message_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState icon="" title="No results" description={`No messages match "${searchQuery}"`} />
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.searchItem}
                onPress={() => router.push(`/conversation/${item.conversation_id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="callout" color="primary" numberOfLines={1}>
                    {item.conversation_title}
                  </Text>
                  <Text variant="caption" color="tertiary" numberOfLines={2}>
                    {item.content}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                icon=""
                title="No conversations yet"
                description="Start your first AI chat — it works fully offline."
                action={{ label: 'New Chat', onPress: handleNewChat }}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.conversationItem}
                onPress={() => router.push(`/conversation/${item.id}`)}
              >
                <Avatar letter={item.title.charAt(0)} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" color="primary" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  hitSlop={8}
                  style={{ padding: spacing.sm }}
                >
                  <Trash2 size={16} color={colors.textTertiary} strokeWidth={2} />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});