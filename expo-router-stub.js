// Stub for `expo-router`.
//
// @telnyx/react-voice-commons-sdk's useAppStateHandler hook imports
// `expo-router` at module load time to call router.replace('/') on
// background disconnect. Metro traces the full module graph of any
// re-exported symbol from the SDK, so the unused hook still pulls
// `expo-router` into the bundle and fails to resolve in a bare RN
// project that doesn't use Expo.
//
// This stub is wired in via metro.config.js (resolver.resolveRequest)
// and satisfies the bundler without pulling in the Expo ecosystem.
// Since useAppStateHandler is never actually called in this bare demo,
// these no-op implementations are never invoked at runtime.
//
// If/when the SDK moves useAppStateHandler to a separate subpath
// export (e.g. `@telnyx/react-voice-commons-sdk/hooks/useAppStateHandler`),
// this stub can be deleted.

const noopRouter = {
  replace: () => {},
  push: () => {},
  back: () => {},
  navigate: () => {},
  setParams: () => {},
  canGoBack: () => false,
};

module.exports = {
  router: noopRouter,
  useRouter: () => noopRouter,
  useLocalSearchParams: () => ({}),
  useSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Stack: () => null,
  Slot: () => null,
  Tabs: () => null,
  Link: () => null,
  Redirect: () => null,
};
