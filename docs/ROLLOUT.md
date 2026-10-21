# Rolling the app out to two phones (Expo Go + EAS Update)

Two people (Android and iPhone) use the app through **Expo Go**. Changes reach both phones with
**EAS Update**, with no laptop running and no app-store or Apple/Google account. Each phone keeps its
own history in its own local SQLite database.

## What this setup is, and is not

- It is Expo Go, not a standalone installed app: you open the app inside Expo Go.
- Updates are published **without a `runtimeVersion`**. The Expo docs say updates published with a
  `runtimeVersion` cannot be loaded in Expo Go, so do not add one to `app.json`.
- Only Expo Go-compatible libraries work. Local rest-timer notifications (`expo-notifications`) may
  behave differently inside Expo Go; the in-app timer works either way.
- The project's SDK must match the SDK the **App Store / Play Store Expo Go** supports. Check
  `expoGoSdkVersion` at https://api.expo.dev/v2/versions/latest before upgrading. At the time of
  writing it is **57**; SDK 58 exists on npm but its Expo Go was not in the stores yet, so the project
  stays on SDK 57 until that field says 58.

## One-time setup

1. Install [Bun](https://bun.sh) and run `bun install`.
2. Log in to Expo (interactive): `bunx eas-cli login`. Check with `bunx eas-cli whoami`.
3. `app.json` already has `owner` and `extra.eas.projectId`. Keep `slug` unchanged: it identifies
   the project (and each phone's stored data) inside Expo Go.
4. Each phone installs **Expo Go** from its store.

## Shipping a change

1. Merge the change to `main` (CI runs typecheck, lint and format check).
2. Publish to the `preview` branch and test on the Android phone:
   `bun run update:preview "what changed"`
3. Open the printed link or QR code in Expo Go. On the iPhone, scan the QR with the Camera app.
4. When it looks right, promote that exact update to the iPhone's branch:
   `bun run update:stable "what changed"`

Android opens the **preview** link, the iPhone opens the **stable** link. Both phones need to reopen
the app (fully close, then open) to pick up a new update.

## What needs more than an update

- **A new SDK:** Expo Go supports one SDK at a time, so both phones must update Expo Go from their
  store and the project must be on that SDK. Upgrade one SDK at a time and run the gates in
  `AGENTS.md` first.
- Native-only changes are not an issue in Expo Go as long as the library is bundled in Expo Go.

## Data safety

- History is stored inside Expo Go's storage on that phone. Clearing Expo Go's data, uninstalling
  Expo Go, or losing the phone deletes it.
- Use **History > Backup > Back up my data** regularly. It saves a JSON file (workouts, weigh-ins,
  cardio, photo records, settings) through the share sheet. Photo image files are not included.
- There is no restore yet; the file is a safety copy for now.

## Unverified until tested on real phones

- How the iPhone's Expo Go opens a private project's update (whether she needs access to the Expo
  project). Test with the first real update and write down what works here.
- Whether `eas update` asks to install `expo-updates` for this project. If it does, follow its prompt
  but do not set `runtimeVersion`.
- Rest-timer notifications in Expo Go on both platforms.
