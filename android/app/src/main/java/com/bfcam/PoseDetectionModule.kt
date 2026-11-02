package com.bfcam

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions

class PoseDetectionModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "PoseDetectorModule"

  @ReactMethod
  fun detect(uri: String, promise: Promise) {
    try {
      val image = InputImage.fromFilePath(context, Uri.parse(uri))
      val detector = PoseDetection.getClient(PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.SINGLE_IMAGE_MODE).build())
      detector.process(image).addOnSuccessListener { pose ->
        val landmarks = Arguments.createArray()
        val names = mapOf(
          PoseLandmark.NOSE to "nose", PoseLandmark.LEFT_SHOULDER to "leftShoulder", PoseLandmark.RIGHT_SHOULDER to "rightShoulder",
          PoseLandmark.LEFT_ELBOW to "leftElbow", PoseLandmark.RIGHT_ELBOW to "rightElbow", PoseLandmark.LEFT_WRIST to "leftWrist", PoseLandmark.RIGHT_WRIST to "rightWrist",
          PoseLandmark.LEFT_HIP to "leftHip", PoseLandmark.RIGHT_HIP to "rightHip", PoseLandmark.LEFT_KNEE to "leftKnee", PoseLandmark.RIGHT_KNEE to "rightKnee",
          PoseLandmark.LEFT_ANKLE to "leftAnkle", PoseLandmark.RIGHT_ANKLE to "rightAnkle")
        names.forEach { (type, name) -> pose.getPoseLandmark(type)?.let { point ->
          landmarks.pushMap(Arguments.createMap().apply {
            putString("name", name); putDouble("x", point.position.x.toDouble()); putDouble("y", point.position.y.toDouble())
            putDouble("z", point.position3D.z.toDouble()); putDouble("confidence", point.inFrameLikelihood.toDouble())
          })
        }}
        promise.resolve(Arguments.createMap().apply {putInt("width", image.width); putInt("height", image.height); putArray("landmarks", landmarks)})
        detector.close()
      }.addOnFailureListener { error -> detector.close(); promise.reject("POSE_DETECTION_FAILED", error) }
    } catch (error: Exception) { promise.reject("POSE_IMAGE_INVALID", error) }
  }

  @ReactMethod
  fun detectLabels(uri: String, promise: Promise) {
    try {
      val image = InputImage.fromFilePath(context, Uri.parse(uri))
      val options = ImageLabelerOptions.Builder().setConfidenceThreshold(0.5f).build()
      val labeler = ImageLabeling.getClient(options)
      labeler.process(image).addOnSuccessListener { labels ->
        val result = Arguments.createArray()
        labels.forEach { label -> result.pushMap(Arguments.createMap().apply {
          putString("text", label.text)
          putDouble("confidence", label.confidence.toDouble())
          putInt("index", label.index)
        }) }
        labeler.close()
        promise.resolve(result)
      }.addOnFailureListener { error -> labeler.close(); promise.reject("IMAGE_LABELING_FAILED", error) }
    } catch (error: Exception) { promise.reject("LABEL_IMAGE_INVALID", error) }
  }
}
