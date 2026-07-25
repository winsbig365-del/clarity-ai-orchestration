import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Plus, Smartphone, Globe, Clock, CheckCircle, XCircle, Loader, Trash2 } from 'lucide-react-native';
import { Screen, Text, Button, EmptyState, Card } from '../../components';
import { useSession } from '../../lib/session';
import { getProjectsByUser, createProject, deleteProject } from '../../services/queries';
import type { Project } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  queued: { icon: Clock, color: colors.warning, label: 'Queued' },
  building: { icon: Loader, color: colors.info, label: 'Building' },
  completed: { icon: CheckCircle, color: colors.success, label: 'Completed' },
  failed: { icon: XCircle, color: colors.destructive, label: 'Failed' },
};

const typeIcons: Record<string, any> = {
  apk: Smartphone,
  web: Globe,
};

export default function ProjectsScreen() {
  const { user } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const projs = await getProjectsByUser(user.id);
    setProjects(projs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleNewProject = async () => {
    if (!user) return;
    const project = await createProject(user.id, 'New Build', 'apk');
    setProjects((prev) => [project, ...prev]);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
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
      <View style={styles.header}>
        <Text variant="title" color="primary">Projects</Text>
        <Pressable onPress={handleNewProject} style={styles.newButton}>
          <Plus size={20} color={colors.onAccent} strokeWidth={2.5} />
        </Pressable>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="" title="No projects yet" description="Build APKs or web apps — all tracked offline with sync queue support." action={{ label: 'New Project', onPress: handleNewProject }} />
        }
        renderItem={({ item }) => {
          const status = statusConfig[item.status] ?? statusConfig.queued;
          const StatusIcon = status.icon;
          const TypeIcon = typeIcons[item.type] ?? Globe;

          return (
            <Card style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <View style={styles.typeBadge}>
                  <TypeIcon size={14} color={colors.accent} strokeWidth={2} />
                  <Text variant="footnote" color="accent">{item.type.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <StatusIcon size={12} color={status.color} strokeWidth={2} />
                    <Text variant="footnote" style={{ color: status.color }}>{status.label}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteProject(item.id)} hitSlop={8}>
                    <Trash2 size={14} color={colors.textTertiary} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>

              <Text variant="subhead" color="primary" style={{ marginTop: spacing.sm }}>
                {item.name}
              </Text>
              <Text variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
                Created {new Date(item.created_at).toLocaleDateString()}
              </Text>

              {item.build_url ? (
                <View style={styles.buildInfo}>
                  <Text variant="footnote" color="accent" numberOfLines={1}>
                    Build available
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        }}
      />
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
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  projectCard: {
    gap: 0,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  buildInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});