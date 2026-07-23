export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT';
export type UserRole = 'admin' | 'member';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ProjectType = 'apk' | 'web';
export type ProjectStatus = 'queued' | 'building' | 'completed' | 'failed';
export type MediaType = 'image' | 'video' | 'audio';
export type ConnectorType = 'rest' | 'graphql' | 'webhook' | 'mcp';
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  access_code: string;
  encrypted_preferences: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  custom_prompt_override: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  sync_status: SyncStatus;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  type: ProjectType;
  config: string;
  status: ProjectStatus;
  build_url: string | null;
  local_apk_path: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Media {
  id: string;
  user_id: string;
  type: MediaType;
  local_uri: string;
  thumbnail_uri: string | null;
  prompt: string;
  metadata: string;
  size_bytes: number;
  created_at: string;
  sync_status: SyncStatus;
}

export interface PromptTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  variables: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Connector {
  id: string;
  user_id: string;
  name: string;
  type: ConnectorType;
  config: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Invite {
  code: string;
  email: string | null;
  used: boolean;
  used_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  created_at: string;
  attempted_at: string | null;
}

export interface SearchResult {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  snippet: string;
}