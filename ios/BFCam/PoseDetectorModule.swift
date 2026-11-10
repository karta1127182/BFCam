import Foundation
import UIKit
import React
import MLKitPoseDetection
import MLKitPoseDetectionCommon
import MLKitVision
import MLKitImageLabeling
import MLKitObjectDetection
import ImageIO

@objc(PoseDetectorModule)
final class PoseDetectorModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(detectObjects:resolver:rejecter:)
  func detectObjects(_ uri: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      let path = uri.hasPrefix("file://") ? String(uri.dropFirst(7)) : uri
      guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true,
          kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 1600] as CFDictionary)
      else { reject("OBJECT_IMAGE_INVALID", "Unable to read image", nil); return }
      let image = UIImage(cgImage: cgImage)
      let options = ObjectDetectorOptions(); options.detectorMode = .singleImage; options.shouldEnableMultipleObjects = true
      let detector = ObjectDetector.objectDetector(options: options)
      let labelOptions = ImageLabelerOptions(); labelOptions.confidenceThreshold = 0.55
      let labeler = ImageLabeler.imageLabeler(options: labelOptions)
      detector.process(VisionImage(image: image)) { objects, error in
        if let error = error { reject("OBJECT_DETECTION_FAILED", error.localizedDescription, error); return }
        let group = DispatchGroup(); let lock = NSLock()
        var results: [Int: [String: Any]] = [:]
        for (index, object) in (objects ?? []).prefix(5).enumerated() {
          let rect = object.frame.intersection(CGRect(x: 0, y: 0, width: CGFloat(cgImage.width), height: CGFloat(cgImage.height))).integral
          guard !rect.isEmpty, !rect.isNull, let crop = cgImage.cropping(to: rect) else { continue }
          group.enter()
          labeler.process(VisionImage(image: UIImage(cgImage: crop))) { labels, _ in
            let result: [String: Any] = ["x": rect.minX / CGFloat(cgImage.width), "y": rect.minY / CGFloat(cgImage.height),
              "width": rect.width / CGFloat(cgImage.width), "height": rect.height / CGFloat(cgImage.height),
              "labels": (labels ?? []).map { ["text": $0.text, "confidence": $0.confidence] }]
            lock.lock(); results[index] = result; lock.unlock(); group.leave()
          }
        }
        group.notify(queue: .main) { resolve(results.keys.sorted().compactMap { results[$0] }) }
      }
    }
  }

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

  @objc(detectLabels:resolver:rejecter:)
  func detectLabels(_ uri: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let path = uri.hasPrefix("file://") ? String(uri.dropFirst(7)) : uri
    guard let image = UIImage(contentsOfFile: path) else { reject("LABEL_IMAGE_INVALID", "Unable to read image", nil); return }
    let options = ImageLabelerOptions(); options.confidenceThreshold = 0.5
    let labeler = ImageLabeler.imageLabeler(options: options)
    let visionImage = VisionImage(image: image); visionImage.orientation = image.imageOrientation
    labeler.process(visionImage) { labels, error in
      if let error = error { reject("IMAGE_LABELING_FAILED", error.localizedDescription, error); return }
      resolve((labels ?? []).map { ["text": $0.text, "confidence": $0.confidence, "index": $0.index] })
    }
  }
}
