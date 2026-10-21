# Expo HAS CHANGED

Expo SDK 57 (package pins `~57.0.x`): read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. Use `bun`/`bunx` for all package and script commands, not npm/npx. Stay on the SDK the App Store's Expo Go supports (check `expoGoSdkVersion` at https://api.expo.dev/v2/versions/latest) before upgrading.

# AI Agent Operating Rules

## Required Reading Order

Before performing any task, agents must read:

1. docs/PROJECT_CONTEXT.md
2. relevant files in docs/domain/
3. relevant files in docs/architecture/
4. the current task request

The PDFs in docs/ are the source of truth for the training system.

---

## General Rules

- Do not invent features outside the defined MVP.
- Do not redesign the training methodology (exercises, prescriptions, progression and RPE rules). The weekly order is user-chosen; see docs/PROJECT_CONTEXT.md.
- Do not generate placeholder architecture.
- Prefer iterative changes over large rewrites.
- Preserve type safety.
- Prefer explicit types over implicit inference.
- Keep files focused and modular.
- Avoid unnecessary abstractions early in development.
- Avoid premature optimization.

---

## Product Constraints

This app is:

- execution-focused
- progression-focused
- offline-first
- mobile-first
- structured around a fixed program (12 weeks, five workouts per week) that the user works through in an order they choose

This app is NOT:

- a generic workout builder
- a social platform
- an AI coaching app
- a calorie tracker
- a wearable ecosystem

---

## Coding Constraints

- Use TypeScript strictly.
- Prefer functional React components.
- Prefer simple and readable code.
- Avoid over-engineering state management.
- Avoid introducing backend/cloud systems unless explicitly requested.
- Do not introduce new dependencies without justification.
- SQLite is the primary persistence layer.

---

## Workflow Rules

Agents should:

1. understand the task,
2. inspect existing structure,
3. propose minimal necessary changes,
4. implement only the requested scope.

Agents must NOT:

- refactor unrelated areas,
- generate large speculative systems,
- create unused files,
- introduce architectural drift.

---

## Extraction Rules

When working with PDFs:

- extract structured information incrementally,
- focus on one conceptual domain at a time,
- avoid mixing extraction with implementation,
- preserve terminology from the original program.

---

## Important Principle

The goal is to translate the existing training system into software — not to invent a new fitness platform.
