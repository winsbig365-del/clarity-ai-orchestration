import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { ImageIcon, Video, Music, X, Trash2 } from 'lucide-react-native';
import { Screen, Text, Button, EmptyState, Card } from '../../components';
import { useSession } from '../../lib/session';
import { getMediaByUser, createMedia, deleteMedia } from '../../services/queries';
import type { Media } from '../../types';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

const typeIcons: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
};

const typeColors: Record<string, string> = {
  image: '#10B981',
  video: '#F59E0B',
  audio: '#8B5CF6',
};

const SEED_MEDIA = [
  { type: 'image' as const, prompt: 'Futuristic city skyline at sunset, neon reflections', sizeBytes: 2450000, metadata: { resolution: '1024x1024', model: 'Stable Diffusion XL', seed: 847291 } },
  { type: 'image' as const, prompt: 'Abstract geometric patterns with indigo and gold', sizeBytes: 1800000, metadata: { resolution: '1024x1024', model: 'DALL-E 3', seed: 123456 } },
  { type: 'video' as const, prompt: 'Cinematic drone flyover of mountain range', sizeBytes: 15200000, metadata: { duration: '12s', resolution: '1080p', fps: 30 } },
  { type: 'audio' as const, prompt: 'Lo-fi ambient beat with piano and rain sounds', sizeBytes: 4200000, metadata: { duration: '3:22', format: 'mp3', bitrate: '320kbps' } },
  { type: 'image' as const, prompt: 'Cyberpunk samurai character concept art', sizeBytes: 3100000, metadata: { resolution: '2048x2048', model: 'Midjourney v6', seed: 555123 } },
  { type: 'image' as const, prompt: 'Minimalist logo design for tech startup', sizeBytes: 890000, metadata: { resolution: '1024x1024', model: 'DALL-E 3', seed: 789012 } },
  { type: 'video' as const, prompt: 'Slow-motion water droplet macro shot', sizeBytes: 8900000, metadata: { duration: '8s', resolution: '4K', fps: 120 } },
];

export default function MediaScreen() {
  const { user } = useSession();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  const loadMedia = useCallback(async () => {
    if (!user) return;
    let items = await getMediaByUser(user.id);

    if (items.length === 0) {
      for (const m of SEED_MEDIA) {
        const created = await createMedia(
          user.id,
          m.type,
          `file://local/generated/${Date.now()}_${m.type}_${Math.random().toString(36).slice(2, 8)}`,
          m.prompt,
          m.metadata,
          m.sizeBytes,
        );
        items.push(created);
      }
    }

    setMedia(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleDelete = async (id: string) => {
    await deleteMedia(id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    setSelectedMedia(null);
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="tertiary">Loading media library...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" color="primary">Media</Text>
        <Text variant="caption" color="tertiary">{media.length} assets</Text>
      </View>

      <FlatList
        data={media}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        ListEmptyComponent={
          <EmptyState
            icon=""
            title="No media yet"
            description="AI-generated images, video, and audio appear here — all stored offline in the local database."
          />
        }
        renderItem={({ item }) => {
          const TypeIcon = typeIcons[item.type] ?? ImageIcon;
          const typeColor = typeColors[item.type] ?? colors.accent;

          return (
            <Pressable style={styles.mediaCardWrapper} onPress={() => setSelectedMedia(item)}>
              <Card style={styles.mediaCard}>
                <View style={[styles.thumbnail, { backgroundColor: `${typeColor}15` }]}>
                  <TypeIcon size={32} color={typeColor} strokeWidth={1.5} />
                  <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
                </View>

                <View style={styles.mediaInfo}>
                  <Text variant="caption" color="primary" numberOfLines={2}>
                    {item.prompt}
                  </Text>
                  <View style={styles.mediaMeta}>
                    <View style={styles.typeBadge}>
                      <TypeIcon size={10} color={typeColor} strokeWidth={2} />
                      <Text variant="footnote" style={{ color: typeColor }}>{item.type}</Text>
                    </View>
                    <Text variant="footnote" color="tertiary">
                      {formatSize(item.size_bytes)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <Modal visible={!!selectedMedia} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable onPress={() => setSelectedMedia(null)} style={styles.closeButton}>
              <X size={20} color={colors.text} strokeWidth={2} />
            </Pressable>

            {selectedMedia && (() => {
              const TypeIcon = typeIcons[selectedMedia.type] ?? ImageIcon;
              const typeColor = typeColors[selectedMedia.type] ?? colors.accent;
              const meta = JSON.parse(selectedMedia.metadata || '{}');

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.detailThumbnail, { backgroundColor: `${typeColor}10` }]}>
                    <TypeIcon size={64} color={typeColor} strokeWidth={1} />
                  </View>

                  <Text variant="heading" color="primary" style={{ marginTop: spacing.lg }}>
                    {selectedMedia.type.charAt(0).toUpperCase() + selectedMedia.type.slice(1)}
                  </Text>

                  <Text variant="body" color="secondary" style={{ marginTop: spacing.md }}>
                    {selectedMedia.prompt}
                  </Text>

                  <View style={styles.metaGrid}>
                    <MetaItem label="Type" value={selectedMedia.type} />
                    <MetaItem label="Size" value={formatSize(selectedMedia.size_bytes)} />
                    {Object.entries(meta).map(([key, value]) => (
                      <MetaItem key={key} label={key} value={String(value)} />
                    ))}
                    <MetaItem label="Created" value={new Date(selectedMedia.created_at).toLocaleDateString()} />
                    <MetaItem label="Sync" value={selectedMedia.sync_status} />
                  </View>

                  <View style={styles.detailActions}>
                    <Button
                      title="Delete"
                      onPress={() => handleDelete(selectedMedia.id)}
                      variant="destructive"
                      size="sm"
                    />
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={metaStyles.item}>
      <Text variant="footnote" color="tertiary" style={{ textTransform: 'capitalize' }}>
        {label}
      </Text>
      <Text variant="callout" color="primary" numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  mediaCardWrapper: {
    flex: 1,
  },
  mediaCard: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  typeDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mediaInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  mediaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailThumbnail: {
    height: 200,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
  },
});

const metaStyles = StyleSheet.create({
  item: {
    width: '47%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
  },
});