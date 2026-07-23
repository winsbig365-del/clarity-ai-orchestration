import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type {
  User, Conversation, Message, Project, Media,
  PromptTemplate, Connector, Invite, SyncQueueItem, SyncStatus,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────

function uuid(): string {
  return Crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

async function enqueueSync(
  entityType: string,
  entityId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: object,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), entityType, entityId, operation, JSON.stringify(payload), now()],
  );
}

// ─── Users ───────────────────────────────────────────────────

export async function createUser(
  email: string,
  role: 'admin' | 'member' = 'member',
  accessCode: string,
): Promise<User> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO users (id, email, role, access_code, encrypted_preferences, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, '{}', ?, ?, 'PENDING')`,
    [id, email, role, accessCode, ts, ts],
  );
  const user: User = { id, email, role, access_code: accessCode, encrypted_preferences: '{}', created_at: ts, updated_at: ts, sync_status: 'PENDING' };
  await enqueueSync('users', id, 'INSERT', user);
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  return db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  return db.getFirstAsync<User>('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  return db.getAllAsync<User>('SELECT * FROM users ORDER BY created_at DESC');
}

// ─── Conversations ───────────────────────────────────────────

export async function createConversation(userId: string, title: string = 'New Chat'): Promise<Conversation> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO conversations (id, user_id, title, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [id, userId, title, ts, ts],
  );
  const conv: Conversation = { id, user_id: userId, title, custom_prompt_override: null, created_at: ts, updated_at: ts, sync_status: 'PENDING' };
  await enqueueSync('conversations', id, 'INSERT', conv);
  return conv;
}

export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  const db = await getDatabase();
  return db.getAllAsync<Conversation>(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Conversation>('SELECT * FROM conversations WHERE id = ?', [id]);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE conversations SET title = ?, updated_at = ?, sync_status = 'PENDING' WHERE id = ?`,
    [title, now(), id],
  );
  await enqueueSync('conversations', id, 'UPDATE', { title });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
  await enqueueSync('conversations', id, 'DELETE', { id });
}

// ─── Messages ────────────────────────────────────────────────

export async function createMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
): Promise<Message> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO messages (id, conversation_id, role, content, timestamp, sync_status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [id, conversationId, role, content, ts],
  );
  const msg: Message = { id, conversation_id: conversationId, role, content, timestamp: ts, sync_status: 'PENDING' };
  await enqueueSync('messages', id, 'INSERT', msg);
  return msg;
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const db = await getDatabase();
  return db.getAllAsync<Message>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
    [conversationId],
  );
}

export async function searchMessages(query: string): Promise<SearchResult[]> {
  const db = await getDatabase();
  return db.getAllAsync<SearchResult>(
    `SELECT m.id as message_id, m.conversation_id, c.title as conversation_title,
            m.role, m.content, m.timestamp,
            snippet(messages_fts, 0, '<mark>', '</mark>', '...', 40) as snippet
     FROM messages_fts
     JOIN messages m ON messages_fts.rowid = m.rowid
     JOIN conversations c ON m.conversation_id = c.id
     WHERE messages_fts MATCH ?
     ORDER BY rank
     LIMIT 50`,
    [query],
  );
}

export interface SearchResult {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  role: string;
  content: string;
  timestamp: string;
  snippet: string;
}

// ─── Projects ────────────────────────────────────────────────

export async function createProject(userId: string, name: string, type: 'apk' | 'web'): Promise<Project> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO projects (id, user_id, name, type, config, status, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, '{}', 'queued', ?, ?, 'PENDING')`,
    [id, userId, name, type, ts, ts],
  );
  const proj: Project = { id, user_id: userId, name, type, config: '{}', status: 'queued', build_url: null, local_apk_path: null, created_at: ts, updated_at: ts, sync_status: 'PENDING' };
  await enqueueSync('projects', id, 'INSERT', proj);
  return proj;
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const db = await getDatabase();
  return db.getAllAsync<Project>(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
  await enqueueSync('projects', id, 'DELETE', { id });
}

export async function updateProjectStatus(
  id: string,
  status: 'queued' | 'building' | 'completed' | 'failed',
  buildUrl?: string,
  localApkPath?: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE projects SET status = ?, build_url = ?, local_apk_path = ?, updated_at = ?, sync_status = 'PENDING' WHERE id = ?`,
    [status, buildUrl || null, localApkPath || null, now(), id],
  );
  await enqueueSync('projects', id, 'UPDATE', { status, build_url: buildUrl, local_apk_path: localApkPath });
}

// ─── Media ───────────────────────────────────────────────────

export async function createMedia(
  userId: string,
  type: 'image' | 'video' | 'audio',
  localUri: string,
  prompt: string,
  metadata: object = {},
  sizeBytes: number = 0,
): Promise<Media> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO media (id, user_id, type, local_uri, prompt, metadata, size_bytes, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [id, userId, type, localUri, prompt, JSON.stringify(metadata), sizeBytes, ts],
  );
  const media: Media = { id, user_id: userId, type, local_uri: localUri, thumbnail_uri: null, prompt, metadata: JSON.stringify(metadata), size_bytes: sizeBytes, created_at: ts, sync_status: 'PENDING' };
  await enqueueSync('media', id, 'INSERT', media);
  return media;
}

export async function getMediaByUser(userId: string): Promise<Media[]> {
  const db = await getDatabase();
  return db.getAllAsync<Media>(
    'SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM media WHERE id = ?', [id]);
  await enqueueSync('media', id, 'DELETE', { id });
}

export async function batchInsertMedia(
  items: Array<{
    userId: string;
    type: 'image' | 'video' | 'audio';
    localUri: string;
    prompt: string;
    metadata?: object;
    sizeBytes?: number;
  }>,
): Promise<Media[]> {
  const results: Media[] = [];
  for (const item of items) {
    const media = await createMedia(item.userId, item.type, item.localUri, item.prompt, item.metadata || {}, item.sizeBytes || 0);
    results.push(media);
  }
  return results;
}

// ─── Prompt Templates ────────────────────────────────────────

export async function createPromptTemplate(
  userId: string,
  name: string,
  content: string,
  variables: string[] = [],
  isPublic: boolean = false,
): Promise<PromptTemplate> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  const varsJson = JSON.stringify(variables);
  await db.runAsync(
    `INSERT INTO prompt_templates (id, user_id, name, content, variables, is_public, usage_count, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDING')`,
    [id, userId, name, content, varsJson, isPublic ? 1 : 0, ts, ts],
  );
  const tmpl: PromptTemplate = { id, user_id: userId, name, content, variables: varsJson, is_public: isPublic, usage_count: 0, created_at: ts, updated_at: ts, sync_status: 'PENDING' };
  await enqueueSync('prompt_templates', id, 'INSERT', tmpl);
  return tmpl;
}

export async function getPromptTemplatesByUser(userId: string): Promise<PromptTemplate[]> {
  const db = await getDatabase();
  return db.getAllAsync<PromptTemplate>(
    'SELECT * FROM prompt_templates WHERE user_id = ? ORDER BY usage_count DESC',
    [userId],
  );
}

export async function incrementPromptUsage(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE prompt_templates SET usage_count = usage_count + 1 WHERE id = ?', [id]);
  await enqueueSync('prompt_templates', id, 'UPDATE', { usage_count: 'increment' });
}

export async function updatePromptTemplate(
  id: string,
  name: string,
  content: string,
  variables: object,
  isPublic: boolean,
): Promise<void> {
  const db = await getDatabase();
  const varsJson = JSON.stringify(variables);
  const ts = now();
  await db.runAsync(
    `UPDATE prompt_templates SET name = ?, content = ?, variables = ?, is_public = ?, updated_at = ?, sync_status = 'PENDING'
     WHERE id = ?`,
    [name, content, varsJson, isPublic ? 1 : 0, ts, id],
  );
  await enqueueSync('prompt_templates', id, 'UPDATE', { name, content, variables: varsJson, is_public: isPublic });
}

export async function deletePromptTemplate(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM prompt_templates WHERE id = ?', [id]);
  await enqueueSync('prompt_templates', id, 'DELETE', { id });
}

// ─── Connectors ──────────────────────────────────────────────

export async function createConnector(
  userId: string,
  name: string,
  type: 'rest' | 'graphql' | 'webhook' | 'mcp',
  config: object = {},
): Promise<Connector> {
  const db = await getDatabase();
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO connectors (id, user_id, name, type, config, active, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'PENDING')`,
    [id, userId, name, type, JSON.stringify(config), ts, ts],
  );
  const conn: Connector = { id, user_id: userId, name, type, config: JSON.stringify(config), active: true, created_at: ts, updated_at: ts, sync_status: 'PENDING' };
  await enqueueSync('connectors', id, 'INSERT', conn);
  return conn;
}

export async function getConnectorsByUser(userId: string): Promise<Connector[]> {
  const db = await getDatabase();
  return db.getAllAsync<Connector>(
    'SELECT * FROM connectors WHERE user_id = ? ORDER BY name ASC',
    [userId],
  );
}

export async function toggleConnector(id: string): Promise<void> {
  const db = await getDatabase();
  const conn = await db.getFirstAsync<Connector>('SELECT * FROM connectors WHERE id = ?', [id]);
  if (conn) {
    const newActive = conn.active ? 0 : 1;
    await db.runAsync('UPDATE connectors SET active = ?, updated_at = ?, sync_status = ? WHERE id = ?', [newActive, now(), 'PENDING', id]);
    await enqueueSync('connectors', id, 'UPDATE', { active: !!newActive });
  }
}

export async function updateConnectorConfig(id: string, config: object): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE connectors SET config = ?, updated_at = ?, sync_status = 'PENDING' WHERE id = ?`,
    [JSON.stringify(config), now(), id],
  );
  await enqueueSync('connectors', id, 'UPDATE', { config });
}

export async function deleteConnector(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM connectors WHERE id = ?', [id]);
  await enqueueSync('connectors', id, 'DELETE', { id });
}

// ─── Invites ─────────────────────────────────────────────────

export async function createInvite(code: string, email: string | null, expiresAt: string): Promise<Invite> {
  const db = await getDatabase();
  const ts = now();
  await db.runAsync(
    `INSERT INTO invites (code, email, used, expires_at, created_at)
     VALUES (?, ?, 0, ?, ?)`,
    [code, email, expiresAt, ts],
  );
  return { code, email, used: false, used_by: null, expires_at: expiresAt, created_at: ts };
}

export async function getAllInvites(): Promise<Invite[]> {
  const db = await getDatabase();
  return db.getAllAsync<Invite>('SELECT * FROM invites ORDER BY created_at DESC');
}

export async function validateInvite(code: string): Promise<Invite | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Invite>(
    'SELECT * FROM invites WHERE code = ? AND used = 0 AND expires_at > ?',
    [code, now()],
  );
}

export async function markInviteUsed(code: string, usedBy: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE invites SET used = 1, used_by = ? WHERE code = ?', [usedBy, code]);
}

// ─── Sync Queue ──────────────────────────────────────────────

export async function getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE attempted_at IS NULL ORDER BY created_at ASC LIMIT ?',
    [limit],
  );
}

export async function markSyncAttempted(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE sync_queue SET attempted_at = ? WHERE id = ?', [now(), id]);
}

export async function markSyncComplete(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

// ─── Stats ───────────────────────────────────────────────────

export async function getStats(): Promise<{
  userCount: number;
  conversationCount: number;
  messageCount: number;
  projectCount: number;
  mediaCount: number;
  pendingSyncCount: number;
}> {
  const db = await getDatabase();
  const [users, convs, msgs, projs, med, sync] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM conversations'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM messages'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM projects'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM media'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue'),
  ]);
  return {
    userCount: users?.count ?? 0,
    conversationCount: convs?.count ?? 0,
    messageCount: msgs?.count ?? 0,
    projectCount: projs?.count ?? 0,
    mediaCount: med?.count ?? 0,
    pendingSyncCount: sync?.count ?? 0,
  };
}