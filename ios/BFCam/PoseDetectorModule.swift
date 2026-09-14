import Foundation
import UIKit
import React
import MLKitPoseDetection
import MLKitPoseDetectionCommon
import MLKitVision

@objc(PoseDetectorModule)
final class PoseDetectorModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! { "PoseDetectorModule" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(detect:resolver:rejecter:)
  func detect(_ uri: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let path = uri.hasPrefix("file://") ? String(uri.dropFirst(7)) : uri
    guard let image = UIImage(contentsOfFile: path) else { reject("POSE_IMAGE_INVALID", "Unable to read image", nil); return }
    let options = PoseDetectorOptions(); options.detectorMode = .singleImage
    let detector = PoseDetector.poseDetector(options: options)
    let visionImage = VisionImage(image: image); visionImage.orientation = image.imageOrientation
    detector.process(visionImage) { pose, error in
      if let error = error { reject("POSE_DETECTION_FAILED", error.localizedDescription, error); return }
      let definitions: [(String, PoseLandmarkType)] = [
        ("nose", .nose), ("leftShoulder", .leftShoulder), ("rightShoulder", .rightShoulder),
        ("leftElbow", .leftElbow), ("rightElbow", .rightElbow), ("leftWrist", .leftWrist), ("rightWrist", .rightWrist),
        ("leftHip", .leftHip), ("rightHip", .rightHip), ("leftKnee", .leftKnee), ("rightKnee", .rightKnee),
        ("leftAnkle", .leftAnkle), ("rightAnkle", .rightAnkle)]
      let landmarks = definitions.compactMap { name, type -> [String: Any]? in
        guard let point = pose?.landmark(ofType: type) else { return nil }
        return ["name": name, "x": point.position.x, "y": point.position.y, "z": point.position.z, "confidence": point.inFrameLikelihood]
      }
      resolve(["width": image.size.width * image.scale, "height": image.size.height * image.scale, "landmarks": landmarks])
    }
  }
}
