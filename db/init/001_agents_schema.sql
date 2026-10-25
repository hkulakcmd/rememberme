-- RememberMe — agent memory schema
-- Shared by all agents (see agentmd/memory.md).
-- Runs automatically on a fresh Postgres volume via docker-entrypoint-initdb.d.
-- Idempotent: safe to re-run against an existing database.

CREATE TABLE IF NOT EXISTS projects (
    id          serial PRIMARY KEY,
    name        text NOT NULL,
    description text,
    created_at  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id          serial PRIMARY KEY,
    project_id  integer REFERENCES projects (id) ON DELETE CASCADE,
    agent_name  text,
    task        text,
    status      text NOT NULL DEFAULT 'pending',
    created_at  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memories (
    id           serial PRIMARY KEY,
    agent_name   text NOT NULL,
    project_name text NOT NULL,
    memory       text NOT NULL,
    created_at   timestamp NOT NULL DEFAULT now(),
    project_id   integer REFERENCES projects (id) ON DELETE CASCADE
);

-- Constraints added separately so existing databases converge to the same shape.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_name_key'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_name_key UNIQUE (name);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
            CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS tasks_agent_idx ON tasks (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS memories_project_idx ON memories (project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS memories_agent_idx ON memories (agent_name, created_at DESC);

-- Seed the project record (idempotent).
INSERT INTO projects (name, description)
VALUES (
    'RememberMe',
    'Birthday reminder PWA: Next.js frontend, Django/DRF backend, PostgreSQL, push notifications.'
)
ON CONFLICT (name) DO NOTHING;
