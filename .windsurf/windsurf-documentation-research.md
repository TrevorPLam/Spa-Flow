# Windsurf .windsurf Rules, Skills, and Workflows - Research Summary

Based on Windsurf's official documentation, here are the setup guidelines, implementation details, best practices, and highest standards for .windsurf rules, skills, and workflows.

---

## WORKFLOWS

### Purpose
Automate repetitive tasks by defining structured sequences of steps or prompts at the trajectory level. Guides Cascade through interconnected tasks like deployments, PR reviews, and code formatting.

### Setup & Storage Locations
- **Primary**: `.windsurf/workflows/` in current workspace directory
- **Sub-directories**: `.windsurf/workflows/` in any sub-directory of workspace
- **Git repositories**: Searches up to git root directory for parent workflows
- **System-level (Enterprise)**: OS-specific directories (read-only, IT-deployed)
  - macOS: `/Library/Application Support/Windsurf/workflows/*.md`
  - Linux/WSL: `/etc/windsurf/workflows/*.md`
  - Windows: `C:\ProgramData\Windsurf\workflows\*.md`

### File Format
- Markdown files with YAML frontmatter
- Character limit: 12,000 characters per file
- Contains: title, description, series of steps with specific instructions

### Creation Methods
1. **UI (easiest)**: Cascade panel → Customizations icon → Workflows panel → + Workflow button
2. **Manual**: Create markdown file in `.windsurf/workflows/` directory
3. **AI-generated**: Ask Cascade to generate workflows (works well for CLI tool sequences)

### Invocation
- **Manual only**: Invoke via `/[workflow-name]` slash command in Cascade
- **Nested workflows**: Can call other workflows from within a workflow (e.g., "Call /workflow-2")

### Discovery
- Automatic discovery from multiple locations
- Deduplicated when multiple folders open in same workspace
- Displays shortest relative path for duplicates

### Example Use Cases
- `/address-pr-comments` - Process GitHub PR comments systematically
- `/git-workflows` - Standardized commit formats and PR creation
- `/dependency-management` - Automate dependency installation/updates
- `/code-formatting` - Run formatters and linters
- `/run-tests-and-fix` - Execute tests and auto-fix errors
- `/deployment` - Deploy to dev/staging/production with checks
- `/security-scan` - Trigger vulnerability scans

---

## SKILLS

### Purpose
Handle complex, multi-step tasks that require reference scripts, templates, checklists, and other supporting files. Uses progressive disclosure to keep context window lean.

### Setup & Storage Locations
- **Workspace (project-specific)**: `.windsurf/skills/<skill-name>/`
- **Global (all workspaces)**: `~/.codeium/windsurf/skills/<skill-name>/`
- **System (Enterprise)**: OS-specific directories (read-only, IT-deployed)
- **Cross-compatibility**: Also discovers `.agents/skills/`, `~/.agents/skills/`, `.claude/skills/`, `~/.claude/skills/`

### File Format
Each skill requires a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: deploy-to-production
description: Guides the deployment process to production with safety checks
---

## Pre-deployment Checklist
1. Run all tests
2. Check for uncommitted changes
3. Verify environment variables

## Deployment Steps
Follow these steps to deploy safely...

[Reference supporting files in this directory as needed]
```

**Required Frontmatter Fields:**
- `name`: Unique identifier (lowercase letters, numbers, hyphens only)
- `description`: Brief explanation for model to decide when to invoke

### Supporting Resources
Place additional files in skill folder alongside `SKILL.md`:
```
.windsurf/skills/deploy-to-production/
├── SKILL.md
├── deployment-checklist.md
├── rollback-procedure.md
└── config-template.yaml
```

### Creation Methods
1. **UI (easiest)**: Cascade panel → three dots → Customizations → Skills section → + Workspace or + Global
2. **Manual**: Create directory structure and `SKILL.md` file with YAML frontmatter

### Invocation
- **Automatic**: Cascade invokes when request matches skill's description (progressive disclosure)
- **Manual**: Type `@skill-name` in Cascade input box

### Best Practices
1. **Clear descriptions**: Be specific about what the skill does and when it should be used
2. **Relevant resources**: Include templates, checklists, and examples
3. **Descriptive names**: `deploy-to-staging` is better than `deploy1`

### Example Use Cases
- Deployment workflows with safety checks
- Code review guidelines
- Testing procedures

---

## RULES

### Purpose
Provide behavioral guidelines ("how to behave") at the prompt level. Persistent, reusable context for Cascade.

### Setup & Storage Locations

| Scope | Location | Notes |
|-------|----------|-------|
| **Global** | `~/.codeium/windsurf/memories/global_rules.md` | Single file, all workspaces, always on, 6,000 char limit |
| **Workspace** | `.windsurf/rules/*.md` | One file per rule, activation modes, 12,000 char limit per file |
| **AGENTS.md** | Any directory in workspace | Root-level = always-on, subdirectory = auto-glob for that directory |
| **System (Enterprise)** | OS-specific (e.g., `/etc/windsurf/rules/`) | IT-deployed, read-only for end users |

### Discovery
- Current workspace and sub-directories: `.windsurf/rules` directories
- Git repositories: Searches up to git root for parent rules
- Multiple workspaces: Deduplicated with shortest relative path displayed

### Activation Modes
Each workspace rule declares activation mode via `trigger` field in frontmatter:

| Mode | `trigger:` value | How it reaches Cascade | Context cost |
|------|-----------------|------------------------|--------------|
| **Always On** | `always_on` | Full content in system prompt every message | Every message |
| **Model Decision** | `model_decision` | Only `description` in system prompt; full content loaded when relevant | Description always; full on demand |
| **Glob** | `glob` | Applied when Cascade reads/edits files matching `globs` pattern | Only when matching files touched |
| **Manual** | `manual` | Not in system prompt; activate via `@rule-name` | Only when @mentioned |

**Note**: Global rules file (`global_rules.md`) and root-level `AGENTS.md` don't use frontmatter — they are always on.

### File Format Example
```markdown
---
trigger: glob
globs: **/*.test.ts
---

All test files must use `describe`/`it` blocks and mock external API calls.
```

### Creation Methods
1. **UI**: Cascade panel → Customizations icon → Rules panel → + Global or + Workspace
2. **Manual**: Create markdown file in appropriate location with frontmatter

### Best Practices
1. **Keep rules simple, concise, and specific** - Long or vague rules confuse Cascade
2. **Avoid generic rules** - Rules like "write good code" are already in training data
3. **Use markdown formatting** - Bullet points, numbered lists easier to follow than paragraphs
4. **Use XML tags for grouping** - Effective way to organize similar rules:
   ```
   <coding_guidelines>
   - My project's programming language is python
   - Use early returns when possible
   - Always add documentation when creating new functions and classes
   </coding_guidelines>
   ```

### Templates
Example rule templates available at: https://windsurf.com/editor/directory

---

## COMPARISON: Skills vs Rules vs Workflows

| Feature | Skills | Rules | Workflows |
|---------|--------|-------|-----------|
| **Purpose** | Multi-step procedures with supporting files | Behavioral guidelines | Prompt templates for repeatable tasks |
| **Structure** | Folder with `SKILL.md` + resource files | Single `.md` file with frontmatter | Single `.md` file |
| **Invocation** | Model decides (progressive disclosure) or `@mention` | `always_on`/`glob`/`model_decision`/`manual` | Manual only via `/slash-command` |
| **In system prompt?** | No — only name + description until invoked | Depends on activation mode | No — listed as available commands |
| **Best for** | Deployments, code review, testing with scripts/templates | Coding style, project conventions, constraints | One-shot runbooks you trigger explicitly |

**Rule of thumb:**
- If Cascade should pick it up automatically AND it needs supporting files → Use a **Skill**
- If it's a short behavioral constraint → Use a **Rule**
- If you always want to trigger it yourself → Use a **Workflow**

---

## ENTERPRISE FEATURES (System-Level)

### System-Level Rules
- OS-specific directories (read-only, IT-deployed)
- Applied across all workspaces
- Cannot be modified by end users without admin permissions

### System-Level Workflows
- Same OS-specific directories as rules
- Ideal for enforcing organization-wide development processes
- Deployment procedures and compliance workflows

---

## Key Character Limits
- **Global rules file**: 6,000 characters
- **Workspace rule files**: 12,000 characters per file
- **Workflow files**: 12,000 characters per file
- **Skills**: No explicit character limit mentioned in documentation

---

## Progressive Disclosure (Skills Only)
Skills use progressive disclosure to minimize context window usage:
- Only `name` and `description` shown to model by default
- Full `SKILL.md` content and supporting files loaded only when Cascade decides to invoke the skill
- Allows many skills without bloating context window

---

## Cross-Agent Compatibility
Windsurf discovers skills in multiple locations for compatibility with other AI coding agents:
- `.windsurf/skills/` and `~/.codeium/windsurf/skills/` (Windsurf native)
- `.agents/skills/` and `~/.agents/skills/` (Cross-agent standard)
- `.claude/skills/` and `~/.claude/skills/` (Claude Code, if enabled)
