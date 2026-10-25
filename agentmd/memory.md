# Agent Memory System

All agents share the same memory database.

Before starting any task:

1. Check if the project already exists in table `projects`.
2. Read relevant records from table `memories`.
3. Read active tasks from table `tasks`.
4. Continue work according to existing project history.

After completing work:

1. Update or create task records in `tasks`.
2. Save important decisions in `memories`.
3. Update project status if necessary.

Database Structure

projects
--------
id
name
description
created_at

tasks
--------
id
project_id
agent_name
task
status
created_at

memories
--------
id
agent_name
project_name
memory
created_at

Memory Rules

- Store architectural decisions.
- Store deployment decisions.
- Store important implementation details.
- Store security findings.
- Store unresolved issues.

Do not store:

- temporary thoughts
- repeated information
- generated code

Example Memory Entries

Architect:
"Selected Django backend and PostgreSQL production database."

FrontDev:
"Authentication pages completed."

BackDev:
"Implemented JWT authentication."

Security:
"Detected missing CSRF protection."

DevOps:
"Application deployed to OVH VPS."

Task Status Values

pending
in_progress
completed
blocked

Agent Responsibilities

Architect:
- Reads project memories
- Writes architecture decisions

FrontDev:
- Reads architecture memories
- Writes frontend progress

BackDev:
- Reads architecture memories
- Writes backend progress

Reviewer:
- Writes review findings

Security:
- Writes security findings

DevOps:
- Writes deployment and infrastructure decisions

Always use existing project memory before making new decisions.
