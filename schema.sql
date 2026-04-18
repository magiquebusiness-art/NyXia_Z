-- ══════════════════════════════════════════
-- NYXIA Z — MA MÉMOIRE PERMANENTE
-- ══════════════════════════════════════════

-- Les règles que Diane m'a données
CREATE TABLE IF NOT EXISTS nyxia_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'high',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Ce que je sais de Diane
CREATE TABLE IF NOT EXISTS diane_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT DEFAULT 'Diane',
  company TEXT DEFAULT '',
  role TEXT DEFAULT '',
  preferences TEXT DEFAULT '{}',
  last_updated TEXT DEFAULT (datetime('now'))
);

-- Les projets en cours
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT DEFAULT '',
  domain TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  description TEXT DEFAULT '',
  tech_stack TEXT DEFAULT '[]',
  last_session TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- L'historique de nos conversations (résumé par session)
CREATE TABLE IF NOT EXISTS session_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  summary TEXT DEFAULT '',
  decisions TEXT DEFAULT '[]',
  tasks_completed TEXT DEFAULT '[]',
  tasks_pending TEXT DEFAULT '[]',
  mood TEXT DEFAULT 'focused',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Les connaissances techniques apprises (texte + PDF)
CREATE TABLE IF NOT EXISTS knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  type TEXT DEFAULT 'text',
  file_name TEXT DEFAULT '',
  page_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Les agents qui travaillent pour moi
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  capabilities TEXT DEFAULT '[]',
  status TEXT DEFAULT 'ready',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Intégrations tierces
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔗',
  status TEXT DEFAULT 'disconnected',
  config TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tâches WAN vidéo
CREATE TABLE IF NOT EXISTS wan_tasks (
  task_id TEXT PRIMARY KEY,
  prompt TEXT,
  model TEXT,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
