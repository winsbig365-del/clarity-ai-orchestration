import * as SecureStore from 'expo-secure-store';
import { getPendingSyncItems, markSyncAttempted, markSyncComplete } from './queries';

const SYNC_ENDPOINT_KEY = 'clarity_sync_endpoint';
const SYNC_LOG_KEY = 'clarity_sync_log';

export interface FlushResult {
  success: number;
  failed: number;
  errors: Array<{ entityId: string; entityType: string; error: string }>;
}

export interface SyncLogEntry {
  timestamp: string;
  success: number;
  failed: number;
  total: number;
}

export async function getSyncEndpoint(): Promise<string | null> {
  return SecureStore.getItemAsync(SYNC_ENDPOINT_KEY);
}

export async function setSyncEndpoint(url: string): Promise<void> {
  await SecureStore.setItemAsync(SYNC_ENDPOINT_KEY, url);
}

export async function clearSyncEndpoint(): Promise<void> {
  await SecureStore.deleteItemAsync(SYNC_ENDPOINT_KEY);
}

export async function flushSyncQueue(): Promise<FlushResult> {
  const endpoint = await getSyncEndpoint();
  if (!endpoint) {
    return { success: 0, failed: 0, errors: [] };
  }

  const items = await getPendingSyncItems(50);
  if (items.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors: FlushResult['errors'] = [];

  for (const item of items) {
    try {
      await markSyncAttempted(item.id);

      const response = await fetch(`${endpoint}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          operation: item.operation,
          payload: JSON.parse(item.payload),
          timestamp: item.created_at,
        }),
      });

      if (response.ok) {
        await markSyncComplete(item.id);
        success++;
      } else {
        failed++;
        errors.push({ entityId: item.entity_id, entityType: item.entity_type, error: `HTTP ${response.status}` });
      }
    } catch (err: any) {
      failed++;
      errors.push({ entityId: item.entity_id, entityType: item.entity_type, error: err.message || 'Network error' });
    }
  }

  await appendSyncLog({ success, failed, total: items.length });
  return { success, failed, errors };
}

export async function getQueueStats(): Promise<{ pending: number; attempted: number; total: number }> {
  const items = await getPendingSyncItems(1000);
  const pending = items.filter((i) => !i.attempted_at).length;
  const attempted = items.filter((i) => i.attempted_at).length;
  return { pending, attempted, total: items.length };
}

export async function getSyncLog(): Promise<SyncLogEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(SYNC_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function appendSyncLog(entry: { success: number; failed: number; total: number }): Promise<void> {
  const log = await getSyncLog();
  log.unshift({ ...entry, timestamp: new Date().toISOString() });
  const trimmed = log.slice(0, 50);
  await SecureStore.setItemAsync(SYNC_LOG_KEY, JSON.stringify(trimmed));
}