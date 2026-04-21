// AppDelegate.mm
//
// Reference AppDelegate for bare React Native projects integrating the
// Telnyx Voice Commons SDK from Objective-C++. The Telnyx-specific calls are:
//
//   - [TelnyxVoipPushHandler initializeVoipRegistration]
//       Registers for VoIP pushes via PushKit + RNVoipPushNotificationManager.
//       Call once from didFinishLaunchingWithOptions.
//
//   - [[TelnyxVoipPushHandler shared] handleVoipTokenUpdate:type:]
//       Forwards PushKit credentials to the SDK so Telnyx can target the device.
//
//   - [[TelnyxVoipPushHandler shared] handleVoipPush:type:completion:]
//       Reports the incoming call to CallKit synchronously (required by iOS on
//       cold launch) and hands the payload to the SDK. Must invoke `completion`
//       from within this call path — do not wrap in dispatch_async.

#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

// Frameworks referenced by the generated TelnyxVoiceCommons-Swift.h must be
// visible to Clang before the Swift header is consumed.
#import <AVFoundation/AVFoundation.h>
#import <CallKit/CallKit.h>
#import <PushKit/PushKit.h>

// See HEADER_SEARCH_PATHS in the Xcode target for why this is a quoted import.
#import "TelnyxVoiceCommons-Swift.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"TelnyxBareDemo";
  self.initialProps = @{};

  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];

  [TelnyxVoipPushHandler initializeVoipRegistration];

  return result;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

#pragma mark - PKPushRegistryDelegate (VoIP Push Notifications)

- (void)pushRegistry:(PKPushRegistry *)registry
    didUpdatePushCredentials:(PKPushCredentials *)pushCredentials
                     forType:(PKPushType)type
{
  [[TelnyxVoipPushHandler shared] handleVoipTokenUpdate:pushCredentials type:type];
}

- (void)pushRegistry:(PKPushRegistry *)registry
    didReceiveIncomingPushWithPayload:(PKPushPayload *)payload
                              forType:(PKPushType)type
                withCompletionHandler:(void (^)(void))completion
{
  // CRITICAL: TelnyxVoipPushHandler reports the call to CallKit synchronously
  // before invoking `completion`. Do NOT wrap this in dispatch_async — iOS
  // terminates the app on cold launch if the CallKit report is deferred.
  [[TelnyxVoipPushHandler shared] handleVoipPush:payload type:type completion:completion];
}

#pragma mark - Linking API

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  return [super application:application openURL:url options:options] ||
         [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:
          (nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler
{
  BOOL linkingResult = [RCTLinkingManager application:application
                                  continueUserActivity:userActivity
                                    restorationHandler:restorationHandler];
  return [super application:application
       continueUserActivity:userActivity
         restorationHandler:restorationHandler] ||
         linkingResult;
}

@end
