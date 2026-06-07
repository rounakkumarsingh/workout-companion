# Workout Companion — Project Context

## Product Identity

Workout Companion is a structured bodybuilding tracker app focused on executing a 12-week hypertrophy transformation program using a fixed training split and progression system.

The app is not a generic workout generator or social fitness platform.

The primary goal is to help users complete workouts quickly and consistently during gym sessions with minimal logging friction.

The app is built around a repeating 7-day cycle:

* Upper
* Lower
* Rest + Cardio/HIIT(not always, only when user chooses)
* Pull
* Push
* Legs
* Rest

This cycle repeats for 12 weeks.

The experience should feel fast, focused, dark-themed, and optimized for phone use during workouts.

---

## Core Product Principles

1. Minimize workout logging friction.
2. Make progression highly visible.
3. Preserve workout focus during sessions.
4. Respect the structure of the original program.
5. Prioritize consistency and adherence.
6. Prefer clarity over feature overload.
7. Offline access is essential.
8. Tracking is a core feature, not an afterthought.

---

## MVP Scope

The MVP should support:

* Home screen showing:

  * current week (1–12)
  * current training day type
  * Start Workout button
* Workout screen with:

  * hardcoded BTS Beginner exercises
  * up to 4 sets per exercise
  * weight logging
  * reps logging
* Rest Day 1 cardio/HIIT tracking
* SQLite persistence for all workout logs
* Progress screen with:
  * week-by-week summaries
  * exercise progression charts
* Dark-themed mobile UI
* Offline-first functionality

---

## Non-Goals

The MVP is NOT:

* a social fitness platform
* an AI fitness coach
* a calorie tracking app
* a wearable integration platform
* a workout marketplace
* a generic workout builder
* a fully customizable programming system

---

## Technical Direction

* Expo
* React Native
* expo-router
* TypeScript
* SQLite persistence
* Offline-first architecture
* Local-first data storage

---

## Important Constraint

Agents must treat the BTS Beginner program structure as the source of truth for:

* workout scheduling
* exercise selection
* progression structure
* training split
* exercise metadata

Agents should not invent alternative training systems or redesign the original methodology unless explicitly requested.

