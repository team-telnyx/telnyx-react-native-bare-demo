# Telnyx React Native Voice Commons — Bare RN Demo

A minimal bare (non-Expo) React Native reference app integrating [`@telnyx/react-voice-commons-sdk`](https://www.npmjs.com/package/@telnyx/react-voice-commons-sdk). Intended for customers whose React Native projects don't use Expo.

## Stack

- React Native **0.79.2**
- React **19.0.0**
- `AppDelegate.mm` (Objective-C++) — mirrors what upgraded-from-pre-0.77 projects still have
- `@telnyx/react-voice-commons-sdk@^0.2.1`
- iOS only in this v1 — Android parity is a follow-up

## What this demo covers

- Login screen (SIP credentials)
- Dialer screen (outgoing call)
- Active-call UI (mute, hold, hangup)
- Incoming calls via VoIP push with CallKit
- Cold-launch-from-push (accept incoming call from terminated app state)

## Prerequisites

- Xcode 15+
- Physical iPhone (VoIP push does **not** work in the simulator)
- Apple Developer account with:
  - An App ID matching the bundle identifier in `ios/TelnyxBareDemo.xcodeproj`
  - **Push Notifications capability enabled** on that App ID
  - **VoIP Services Certificate** uploaded to your Telnyx portal

## Install

```bash
npm install
cd ios && pod install
```

## Run

```bash
# Terminal 1 (Metro)
npm start

# Terminal 2 (build + deploy to device)
npx react-native run-ios --device="<Your iPhone>"
```

## Integration reference

The bare RN integration requires a number of undocumented dependencies and configurations that the SDK does not currently declare or automate. This section documents every one of them as a checklist for customers integrating from scratch.

### 1. Extra packages to install alongside the SDK

Beyond `@telnyx/react-voice-commons-sdk` itself, the following must be installed in your app because the SDK uses them at runtime but does not declare them as proper peer/required dependencies:

| Package | Used for | Visible if missing |
|---|---|---|
| `@react-native-async-storage/async-storage` | Stored credentials | Runtime crash on login |
| `@react-native-community/netinfo` | Network state monitoring | `Invariant Violation: TurboModuleRegistry 'RNCNetInfo'` |
| `react-native-webrtc` | WebRTC audio | Build fails or `TelnyxRTC` undefined |
| `react-native-websocket-self-signed` | WebSocket with self-signed cert | `package doesn't seem to be linked` on connect |
| `react-native-voip-push-notification` | PushKit registration | Silent — VoIP token stays nil forever |
| `react-native-url-polyfill` | Polyfill for `URLSearchParams.set` | Crash on second login attempt |
| `expo-router` (or Metro stub — see `expo-router-stub.js`) | Imported by SDK's `useAppStateHandler` | Metro bundling fails |

### 2. AppDelegate wiring (`ios/TelnyxBareDemo/AppDelegate.mm`)

- Import `PushKit` and conform to `PKPushRegistryDelegate`
- Call `[TelnyxVoipPushHandler initializeVoipRegistration]` in `didFinishLaunchingWithOptions`
- Implement `pushRegistry:didUpdatePushCredentials:forType:` → forward to `handleVoipTokenUpdate`
- Implement `pushRegistry:didReceiveIncomingPushWithPayload:forType:withCompletionHandler:` → forward to `handleVoipPush` (synchronously — do not wrap in `dispatch_async`)

### 3. Xcode project configuration

- **Push Notifications capability** enabled on the target
- **Background Modes capability** with **Voice over IP** and **Audio, AirPlay, Picture in Picture** checked
- `CODE_SIGN_ENTITLEMENTS` pointing at `TelnyxBareDemo.entitlements` (Debug + Release)
- `HEADER_SEARCH_PATHS` with `"${PODS_CONFIGURATION_BUILD_DIR}/TelnyxVoiceCommons/Swift Compatibility Header"` so the `.mm` file can find `TelnyxVoiceCommons-Swift.h`

### 4. `Info.plist`

- `UIBackgroundModes`: `audio`, `voip`
- `NSMicrophoneUsageDescription`: a non-empty string

### 5. Entitlements (`TelnyxBareDemo.entitlements`)

- `aps-environment` → `development` (or `production` for App Store / TestFlight builds)

### 6. `Podfile`

- `ENV['RCT_NEW_ARCH_ENABLED'] = '0'` to disable New Architecture / Bridgeless mode. The SDK's CallKit bridge does its setup via `DispatchQueue.main.async`, which races with Bridgeless's lazy module instantiation and causes `NO_CALLKIT` errors on outgoing calls.

### 7. Metro config (`metro.config.js`)

- Resolver override that redirects `expo-router` to a local stub (`expo-router-stub.js`). The SDK's `useAppStateHandler` hard-imports `expo-router` at module load, which would otherwise force bare RN consumers to install the entire Expo toolchain.

### 8. React integration (`App.tsx`)

- Wrap your app tree in `<TelnyxVoiceApp voipClient={voipClient} enableAutoReconnect={true}>` to get:
  - Automatic `callKitCoordinator.setVoipClient()` wiring
  - Cold-launch-from-push handling (reads pending push payload, auto-logs in via stored creds, processes the incoming call)
  - Foreground/background reconnection via stored credentials

## Known limitations / SDK coupling

The checklist above exists because the SDK is currently coupled to Expo in a few places. Customers who don't use Expo can still integrate it (as this demo demonstrates), but at the cost of manual configuration that would ideally be handled by the SDK directly. See the SDK repo for the ongoing tracking issue.

## License

MIT
