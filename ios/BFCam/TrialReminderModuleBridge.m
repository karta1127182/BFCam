#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE(TrialReminderModule, NSObject)
RCT_EXTERN_METHOD(schedule:(double)due expiry:(double)expiry body:(NSString *)body resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancel:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
