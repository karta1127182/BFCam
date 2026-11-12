import Foundation
import UserNotifications
import React

@objc(TrialReminderModule)
final class TrialReminderModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }
  private let identifier = "bfcam-pro-trial"
  @objc(schedule:expiry:body:resolver:rejecter:)
  func schedule(_ due: Double, expiry: Double, body: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound]) { granted, error in
      if let error = error {reject("REMINDER_PERMISSION", error.localizedDescription, error); return}
      guard granted else {resolve(false); return}
      let interval = due / 1000 - Date().timeIntervalSince1970
      guard interval > 0, expiry > due else {resolve(false); return}
      let content = UNMutableNotificationContent(); content.title = NSLocalizedString("trial_reminder_title", comment: "Pro trial reminder notification"); content.body = body; content.sound = .default
      let request = UNNotificationRequest(identifier: self.identifier, content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false))
      center.add(request) {error in
        if let error = error {reject("REMINDER_FAILED", error.localizedDescription, error)} else {resolve(true)}
      }
    }
  }
  @objc(cancel:rejecter:)
  func cancel(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [identifier])
    center.removeDeliveredNotifications(withIdentifiers: [identifier])
    resolve(nil)
  }
}
