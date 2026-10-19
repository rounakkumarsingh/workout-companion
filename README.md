# Workout Companion

A structured bodybuilding tracker app for executing a 12-week hypertrophy transformation program. Offline-first, dark-themed, built with Expo and React Native.

## Prerequisites

- [Node.js (LTS)](https://nodejs.org/)
- [Expo Go](https://expo.dev/go) installed on your phone (iOS or Android)
- Your computer and phone on the same Wi-Fi network

## Setup

```sh
git clone <repo-url>
cd workout-companion
npm install
```

## Run on your phone

### 1. Start the dev server

```sh
npx expo start
```

### 2. Open in Expo Go

- **Android**: Scan the QR code in the terminal with the Expo Go app.
- **iOS**: Scan the QR code with the Camera app, then tap the notification to open in Expo Go.

### If QR code doesn't connect (network issues)

Use tunnel mode (slower but works on restricted networks):

```sh
npx expo start --tunnel
```

Then scan the QR code again.

### Platform shortcuts

| Key | Action          |
| --- | --------------- |
| `a`  | Open on Android |
| `i`  | Open on iOS     |
| `w`  | Open in web     |

## Development builds (optional)

If you need native modules not available in Expo Go:

```sh
npx eas build --profile development --platform all
```

## Lint & format

Linting uses [oxlint](https://oxc.rs/docs/guide/usage/linter) (`.oxlintrc.json`) and formatting uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter) (`.oxfmtrc.json`).

```sh
npm run lint          # oxlint
npm run lint:fix      # oxlint, applying safe fixes
npm run format        # oxfmt, rewrite files
npm run format:check  # oxfmt, fail if anything is unformatted
```

## Tech stack

- Expo SDK 54
- React Native 0.81
- Expo Router (file-based routing)
- SQLite via `expo-sqlite`
- Drizzle ORM
- `react-native-reanimated` + `react-native-gesture-handler`
- TypeScript

## Project structure

```
app/            # File-based routing (expo-router)
components/     # Reusable UI components
features/       # Domain-specific feature modules
hooks/          # Custom React hooks
src/            # Core logic (DB, schemas, types)
constants/      # Design tokens, UI constants
docs/           # Project documentation
```

## Learn more

- [Expo docs](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Project context](./docs/PROJECT_CONTEXT.md)
