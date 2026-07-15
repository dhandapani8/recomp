# Recomp Mobile

Expo React Native companion app for Recomp.

## Run locally

```bash
npm run mobile:web
npm run mobile:ios
npm run mobile:android
```

## Install on iPhone

Expo Go is only for quick preview. For an installable iPhone app, build a development or internal iOS build.

### EAS development build

```bash
cd mobile
npx eas login
npx eas build:configure
npm run build:ios:dev
```

EAS will guide Apple signing and device registration. Install the resulting build link on the iPhone.

### Internal preview build

```bash
cd mobile
npm run build:ios:preview
```

Use this when the app does not need the live development client menu.

### Local Xcode build

This machine must have full Xcode selected and a valid signing identity:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
cd mobile
npx expo prebuild --platform ios
npx expo run:ios --device
```

Current local state detected by Codex:

- `xcodebuild` points to Command Line Tools, not full Xcode.
- No valid iOS code-signing identities were found.

That means a signed local `.ipa` cannot be produced here until Xcode/signing are configured.

## Health integration path

- iOS: HealthKit through a development build/native module.
- Android: Health Connect through a development build/native module.
- Web preview: sample adapter data only.

