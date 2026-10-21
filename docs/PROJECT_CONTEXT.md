# Workout Companion — Project Context

## Product Identity

Workout Companion is a structured bodybuilding tracker app focused on executing a 12-week hypertrophy transformation program using a fixed training split and progression system.

The app is not a generic workout generator or social fitness platform.

The primary goal is to help users complete workouts quickly and consistently during gym sessions with minimal logging friction.

The program is 12 weeks. Each program week holds five workouts:

* Upper
* Lower
* Pull
* Push
* Legs

Optional Cardio/HIIT (shown as "Cardio / Mobility") can be logged on rest days.

The order isn't fixed. Each time the user opens the app, they choose today's workout and see what they did in the last 7 days. The app enforces these rules:

* A workout already completed in the current program week can't be chosen again.
* A workout completed in the last 7 days stays locked until 7 days have passed, so no more than five lifting sessions fit in any 7 days.
* Cardio / Mobility can be logged at most once in any 7 days.
* The next program week starts once all five workouts of the current week are completed. This follows the guidebook's advice to carry remaining workouts over into the following week, so nothing is ever "missed".

Rest days are never chosen. The user simply doesn't train that day.

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
  * a choice of today's workout, with the last 7 days of history
  * Start Workout button
* Workout screen with:

  * hardcoded BTS Beginner exercises
  * up to 4 sets per exercise
  * weight logging
  * reps logging
  * a "last time" reference on each exercise that has been done before (workout list and exercise screen); tapping it shows every set from that session
  * substitutions: choosing a substitute asks whether it is for this workout only or for every time (a permanent substitute replaces the prescribed exercise in later workouts until changed back)
* Rest Day 1 cardio/HIIT tracking
* SQLite persistence for all workout logs
* Progress screen with:
  * week-by-week summaries
  * exercise progression charts
  * bodyweight trend (daily weigh-ins, judged by the 7-day average)
  * progress photos (front, side, rear) with a comparison to the previous set
* Daily weigh-in: a skippable prompt when starting or resuming a workout if today has no entry, plus a Home card on any day without one
* Monthly progress photos: a Home banner when 30 days have passed since the last set (or at program start if none)
* Data backup: a History action that saves all workouts, weigh-ins, cardio logs, photo records and settings to a JSON file through the share sheet (history lives only on the phone; restore is not built yet)
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

