import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import {
  Shield,
  Users,
  MessageCircle,
  FolderOpen,
  Image,
  Ticket,
  Copy,
  LogOut,
  RefreshCw,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Screen, Text, Button, Card, Divider } from '../../components';
import { useSession } from '../../lib/session';
import {
  getAllUsers,
  getAllInvites,
  createInvite,
  getStats,
} from '../../services/queries';
import { generateInviteCode, clearSession } from '../../services/auth';
import type { User, Invite } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

export default function AdminScreen() {
  const { user, logout } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState({
    userCount: 0,
    conversationCount: 0,
    messageCount: 0,
    projectCount: 0,
    mediaCount: 0,
    pendingSyncCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [u, i, s] = await Promise.all([
      getAllUsers(),
      getAllInvites(),
      getStats(),
    ]);
    setUsers(u);
    setInvites(i);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateInvite = async () => {
    const code = await generateInviteCode();
    await Clipboard.setStringAsync(code);
    Alert.alert('Invite Created', `Code: ${code}\n\nCopied to clipboard. Valid for 30 days.`);
    const updatedInvites = await getAllInvites();
    setInvites(updatedInvites);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading admin panel...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={[]}
        keyExtractor={() => 'admin'}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text variant="title" color="primary">Admin</Text>
              <View style={styles.roleBadge}>
                <Shield size={12} color={colors.accent} strokeWidth={2.5} />
                <Text variant="footnote" color="accent">{user?.role?.toUpperCase()}</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard icon={Users} label="Users" value={stats.userCount} />
              <StatCard icon={MessageCircle} label="Chats" value={stats.conversationCount} />
              <StatCard icon={MessageCircle} label="Messages" value={stats.messageCount} />
              <StatCard icon={FolderOpen} label="Projects" value={stats.projectCount} />
              <StatCard icon={Image} label="Media" value={stats.mediaCount} />
              <StatCard icon={Ticket} label="Pending Sync" value={stats.pendingSyncCount} />
            </View>

            {/* Sync Settings */}
            <Pressable
              onPress={() => router.push('/sync')}
              style={styles.syncButton}
            >
              <RefreshCw size={18} color={colors.accent} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text variant="callout" color="primary">Sync Settings</Text>
                <Text variant="caption" color="tertiary">
                  Configure endpoint, flush queue, view history
                </Text>
              </View>
              <Text variant="caption" color="accent">
                {stats.pendingSyncCount > 0 ? `${stats.pendingSyncCount} pending` : 'Configure'}
              </Text>
            </Pressable>

            <Divider />

            {/* Invites */}
            <View style={styles.sectionHeader}>
              <Text variant="heading" color="primary">Invites</Text>
              <Button title="Generate" onPress={handleGenerateInvite} size="sm" variant="secondary" />
            </View>

            {invites.slice(0, 5).map((invite) => (
              <View key={invite.code} style={styles.inviteRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="callout" color="primary" style={{ fontFamily: 'Inter-Medium' }}>
                    {invite.code}
                  </Text>
                  <Text variant="footnote" color="tertiary">
                    {invite.used ? `Used by ${invite.used_by}` : invite.email || 'Unassigned'} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.inviteStatus, { backgroundColor: invite.used ? colors.destructiveSoft : colors.accentSoft }]}>
                  <Text variant="footnote" color={invite.used ? 'destructive' : 'accent'}>
                    {invite.used ? 'Used' : 'Active'}
                  </Text>
                </View>
              </View>
            ))}

            <Divider />

            {/* Users */}
            <View style={styles.sectionHeader}>
              <Text variant="heading" color="primary">Users</Text>
              <Text variant="caption" color="tertiary">{users.length} total</Text>
            </View>

            {users.map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text variant="callout" color="accent">{u.email.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="callout" color="primary">{u.email}</Text>
                  <Text variant="footnote" color="tertiary">Joined {new Date(u.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: u.role === 'admin' ? colors.accentSoft : colors.surfaceAlt }]}>
                  <Text variant="footnote" color={u.role === 'admin' ? 'accent' : 'tertiary'}>
                    {u.role.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}

            <View style={{ height: spacing['3xl'] }} />

            {/* Logout */}
            <Button title="Logout" onPress={handleLogout} variant="destructive" size="md" />
          </View>
        }
        renderItem={() => null}
      />
    </Screen>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <View style={statStyles.card}>
      <Icon size={18} color={colors.accent} strokeWidth={2} />
      <Text variant="title" color="primary">{value}</Text>
      <Text variant="footnote" color="tertiary">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  inviteStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
});