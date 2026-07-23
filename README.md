# CLARITY

**Offline-first, invite-only AI orchestration platform for Android and iOS.**

CLARITY runs a full SQLite database on-device as the source of truth, with FTS5 full-text search, an event-sourcing sync queue for cloud replication, local JWT-based invite validation, and real OpenAI / Godmode.ai API integration. Built with Expo, React Native, and TypeScript.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  CLARITY                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Chat   │  │ Projects │  │   Media   │  │
│  │  (FTS5)  │  │ (APK/Web)│  │ (Gallery) │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │        │
│  ┌────┴──────────────┴──────────────┴────┐   │
│  │          SQLite (Source of Truth)      │   │
│  │  • 9 entities • FTS5 • WAL journal    │   │
│  │  • ON DELETE CASCADE • Triggers       │   │
│  │  • Generated column indexes           │   │
│  └───────────────────┬───────────────────┘   │
│                      │                       │
│  ┌───────────────────┴───────────────────┐   │
│  │           Sync Queue                   │   │
│  │  • Event-sourcing log                  │   │
│  │  • Background fetch every 15 min       │   │
│  │  • LWW conflict resolution             │   │
│  └───────────────────┬───────────────────┘   │
│                      │                       │
│  ┌───────────────────┴───────────────────┐   │
│  │         REST Endpoint (self-hosted)    │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Database Schema

| Table | Purpose | Key Features |
|-------|---------|-------------|
| `users` | Local user profiles | Email, role, access_code, encrypted_preferences |
| `conversations` | Chat sessions | Title, custom_prompt_override, timestamps |
| `messages` | Individual messages | Role (user/assistant/system), FTS5-indexed, sync_status |
| `projects` | Build projects | Type (apk/web), config JSON, status, build_url |
| `media` | Generated assets | Type (image/video/audio), local_uri, metadata JSON |
| `prompt_templates` | Reusable prompts | `{{variable}}` injection, usage_count, public/private |
| `connectors` | External API configs | OpenAI, Godmode.ai, REST/GraphQL/Webhook/MCP |
| `invites` | Access codes | JWT-validated, expiration, one-time use |
| `sync_queue` | Offline changes | Entity type, operation, payload, attempted_at |

### Offline-First Sync Strategy

1. All writes go to SQLite first
2. Each write enqueues a sync entry (INSERT/UPDATE/DELETE + full payload)
3. Background task flushes the queue to a self-hosted REST endpoint every 15 minutes
4. Conflicts resolved by Last-Write-Wins (LWW) with user prompt for critical data
5. Invite validation: local JWT signature check + optional remote API fallback

---

## Screens

| Tab | Description |
|-----|-------------|
| **Chat** | Unbounded AI conversations with FTS5 search across messages, conversation management, and template injection |
| **Projects** | Track APK and web builds with live status badges (queued/building/completed/failed) |
| **Media** | Gallery of AI-generated images, video, and audio with detail modal and metadata view |
| **Connectors** | Manage OpenAI and Godmode.ai API keys with connection testing and active/inactive toggle |
| **Admin** | System stats, invite code generation, user management, sync settings, and logout |

### Additional Screens

- **Templates** — Reusable prompt library with `{{variable}}` injection, live preview, and one-tap chat creation
- **Sync Settings** — Endpoint configuration, manual queue flush, sync history log, queue statistics

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 57 |
| UI | React Native 0.79 + TypeScript |
| Database | SQLite via `expo-sqlite` (WAL mode, FTS5) |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Auth | Local JWT (HMAC-SHA256 via `expo-crypto`) + SecureStore |
| Sync | `expo-background-fetch` + `expo-task-manager` |
| Icons | `lucide-react-native` |
| AI | OpenAI API + Godmode.ai API (runtime key resolution) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app (iOS / Android) for device testing
- An OpenAI or Godmode.ai API key (for AI chat features)

### Install

```bash
git clone https://github.com/winsbig365-del/clarity-ai-orchestration.git
cd clarity-ai-orchestration
npm install --legacy-peer-deps
```

### Run

```bash
# Start the dev server
npx expo start

# Scan the QR code with Expo Go (Android) or Camera app (iOS)
# Or press 'w' for web preview
```

### Environment

No `.env` file is needed. API keys are entered in-app through the **Connectors** tab and stored encrypted in the local SQLite database. The sync endpoint is configured in **Admin → Sync Settings**.

---

## Project Structure

```
clarity/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab layout
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── chat.tsx        # Chat screen
│   │   ├── projects.tsx    # Projects screen
│   │   ├── media.tsx       # Media gallery
│   │   ├── connectors.tsx  # Connector management
│   │   └── admin.tsx       # Admin panel
│   ├── conversation/       # Conversation detail
│   │   └── [id].tsx
│   ├── sync.tsx            # Sync settings
│   ├── templates.tsx       # Prompt templates
│   ├── index.tsx           # Invite registration
│   └── _layout.tsx         # Root layout
├── components/             # Reusable UI components
│   └── index.tsx           # Screen, Text, Button, Input, Card, etc.
├── constants/
│   └── theme.ts            # Design tokens (colors, spacing, radius, shadows)
├── lib/
│   └── session.ts          # Zustand session store
├── services/
│   ├── database.ts         # SQLite initialization (DDL, FTS5, triggers)
│   ├── queries.ts          # Full CRUD operations for all 9 entities
│   ├── auth.ts             # JWT signing, invite validation, session management
│   ├── ai.ts               # OpenAI / Godmode.ai API integration
│   ├── sync.ts             # Sync queue flush engine
│   └── syncTask.ts         # Background fetch task registration
├── types/
│   └── index.ts            # TypeScript interfaces for all entities
├── app.json                # Expo configuration
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript configuration
```

---

## Publishing

### To the App Stores

Use the **Publish** button in the Expo preview workspace. It walks through:
1. Connecting your Apple Developer account ($99/yr)
2. Connecting your Google Play account ($25 one-time)
3. Building signed `.ipa` and `.aab` via EAS
4. iOS goes to TestFlight; Android's first upload requires a one-time manual Play Console step

---

## License

MIT — see [LICENSE](LICENSE) for details.