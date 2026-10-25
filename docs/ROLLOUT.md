# Rolling the app out to two phones (Expo Go + EAS Update)

Two people (Android and iPhone) use the app through **Expo Go**; Android can alternatively use its own
preview APK (see "Android: install the preview APK"). Changes reach both phones with
**EAS Update**, with no laptop running and no app-store or Apple/Google account. Each phone keeps its
own history in its own local SQLite database.

## What this setup is, and is not

- It is Expo Go, not a standalone installed app: you open the app inside Expo Go.
- `expo-updates` is installed and `app.json` uses `runtimeVersion: { "policy": "sdkVersion" }`, which
  publishes as `exposdk:58.0.0`, the same runtime version Expo Go itself reports. Do **not** use the
  `appVersion` policy (`eas update` writes that by default): it publishes as `1.0.0`, which Expo Go
  does not match. (One Expo docs page says any `runtimeVersion` blocks Expo Go; the published
  `exposdk:` form is the exception that is meant for it. Confirm on a phone, see below.)
- Only Expo Go-compatible libraries work. Local rest-timer notifications (`expo-notifications`) may
  behave differently inside Expo Go; the in-app timer works either way.
- The project's SDK must match the SDK the **App Store / Play Store Expo Go** supports. Check
  `expoGoSdkVersion` at https://api.expo.dev/v2/versions/latest before upgrading. The project is on
  **SDK 58** (both stores shipped Expo Go 58 on 2026-10-25, although the API field still reported 57
  that day). Re-check the field before the next upgrade.

## One-time setup

1. Install [Bun](https://bun.sh) and run `bun install`.
2. Log in to Expo (interactive): `bunx eas-cli login`. Check with `bunx eas-cli whoami`.
3. `app.json` already has `owner` and `extra.eas.projectId`. Keep `slug` unchanged: it identifies
   the project (and each phone's stored data) inside Expo Go.
4. Create the iPhone's branch once: `bunx eas-cli branch:create stable`.
5. Each phone installs **Expo Go** from its store.

## Shipping a change

1. Merge the change to `main` (CI runs typecheck, lint and format check).
2. Publish to the `preview` branch and test on the Android phone:
   `bun run update:preview "what changed"`
3. Open the printed link or QR code in Expo Go. On the iPhone, scan the QR with the Camera app.
4. When it looks right, promote that exact update to the iPhone's branch:
   `bun run update:stable "what changed"`

Android opens the **preview** link, the iPhone opens the **stable** link. Both phones need to reopen
the app (fully close, then open) to pick up a new update.

## Notes on Expo Go

- **Ownership rule (since 2026-05-12):** Expo Go only loads EAS Updates for projects owned by the
  signed-in account or by an organization it belongs to. Sign in to Expo Go with an account that is a member of the `chikki-workout-app` organization
  (or move the project to an org both people join).
- **Expo Go 57 on Android** could not load EAS Updates ("Failed to download remote update",
  expo/expo#50139). Whether Expo Go 58 fixes it is checked by opening the `preview` link on the
  phone; if it fails, use the APK below.
- **Expo Go on Android has no `ExpoTopicSubscriptionModule`**, so `expo-notifications` is loaded
  lazily in `rest-notifications.ts`; rest alerts are off there and the in-app timer still works.
- `expo-dev-client` is installed, so plain `expo start` targets a dev build; use `bun run start:go`
  for Expo Go.

## Android: install the preview APK

The `preview` EAS Build profile builds an APK on the `preview` channel (linked to the `preview`
update branch) with the project's `exposdk:` runtime, so `bun run update:preview` reaches it.
Rest notifications work in this build.

1. **Back up first.** History in Expo Go does not carry over to the APK (empty database); use
   History > Backup > Back up my data. There is no restore yet.
2. Build: `bunx eas-cli build -p android --profile preview` and download the `.apk`.
3. Install by opening the build link on the phone, or with `adb install -r <file>.apk` (Developer
   options > USB debugging; `adb devices` must list it as `device`). On
   `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, run `adb uninstall com.rounakkumarsingh.workoutcompanion`
   and install again.
4. Updates: publish with `bun run update:preview "message"`, then fully close and reopen the app
   (twice if the first launch only downloads it).
5. A new SDK needs a new APK build; an old APK cannot take updates from a different runtime.

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

- **That Expo Go actually opens the update.** Checked so far: the first update (branch `preview`,
  runtime `exposdk:57.0.0`) is served by Expo's servers with HTTP 200 and no login for the iOS and
  Android platforms. Not checked: the Expo Go app itself on either phone.
- Rest-timer notifications in Expo Go on both platforms.

## Opening an update in Expo Go

Use the link `exp://u.expo.dev/<projectId>/group/<update group id>` (the group id is printed when you
publish, and the EAS dashboard shows a QR code for it). On Android, open Expo Go and paste the link
or scan the QR code; on the iPhone, scan the QR with the Camera app.

## Notes from the first publish

- `eas update` in non-interactive mode needs `--environment preview` (the scripts pass it).
- The first two attempts failed with "Asset processing timed out" on the JavaScript bundles; the
  third, with `runtimeVersion: sdkVersion`, went through. If it times out again, retry once and then
  investigate before retrying more.
