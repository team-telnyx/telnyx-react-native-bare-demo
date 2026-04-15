// AppDelegate.h
//
// Reference AppDelegate for bare React Native projects integrating the
// Telnyx Voice Commons SDK. The AppDelegate conforms to PKPushRegistryDelegate
// so that VoIP push credentials and incoming pushes can be routed through
// TelnyxVoipPushHandler.

#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
#import <PushKit/PushKit.h>

@interface AppDelegate : RCTAppDelegate <PKPushRegistryDelegate>

@property (nonatomic, strong, nullable) PKPushRegistry *voipRegistry;

@end
