package com.bfcam

import android.net.Uri
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.graphics.Rect
import com.google.android.gms.tasks.Tasks
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
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions

class PoseDetectionModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "PoseDetectorModule"

  // Bounded, upright analysis bitmap; never decode the full camera image just to classify crops.
  private fun analysisBitmap(uri: Uri): Bitmap {
    val size = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, size) }
    var sample = 1
    while (maxOf(size.outWidth, size.outHeight) / sample > 1600) sample *= 2
    val bitmap = context.contentResolver.openInputStream(uri).use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: throw IllegalArgumentException("Unable to read image")
    val orientation = context.contentResolver.openInputStream(uri).use {
      if (it == null) 1 else ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)
    }
    val matrix = Matrix().apply {
      when (orientation) {
        2 -> setScale(-1f, 1f)
        3 -> setRotate(180f)
        4 -> setScale(1f, -1f)
        5 -> { setRotate(90f); postScale(-1f, 1f) }
        6 -> setRotate(90f)
        7 -> { setRotate(270f); postScale(-1f, 1f) }
        8 -> setRotate(270f)
      }
    }
    val upright = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (upright !== bitmap) bitmap.recycle()
    return upright
  }

  @ReactMethod
  fun detectObjects(uri: String, promise: Promise) {
    // Decode away from the JS/native-modules queue. ML Kit callbacks complete on its task executor.
    Thread {
      try {
        val bitmap = analysisBitmap(Uri.parse(uri))
        val detector = ObjectDetection.getClient(ObjectDetectorOptions.Builder()
          .setDetectorMode(ObjectDetectorOptions.SINGLE_IMAGE_MODE).enableMultipleObjects().build())
        val labeler = ImageLabeling.getClient(ImageLabelerOptions.Builder().setConfidenceThreshold(.55f).build())
        detector.process(InputImage.fromBitmap(bitmap, 0)).addOnSuccessListener { objects ->
          val crops = mutableListOf<Bitmap>()
          val boxes = objects.take(5).mapNotNull { obj ->
            val box = Rect(obj.boundingBox)
            if (box.intersect(0, 0, bitmap.width, bitmap.height) && box.width() > 0 && box.height() > 0) box else null
          }
          val tasks = boxes.map { box ->
            val crop = Bitmap.createBitmap(bitmap, box.left, box.top, box.width(), box.height())
            crops.add(crop)
            labeler.process(InputImage.fromBitmap(crop, 0))
          }
          Tasks.whenAllComplete(tasks).addOnCompleteListener {
            val result = Arguments.createArray()
            boxes.forEachIndexed { index, box ->
              val labels = Arguments.createArray()
              if (tasks[index].isSuccessful) tasks[index].result.forEach { label ->
                labels.pushMap(Arguments.createMap().apply { putString("text", label.text); putDouble("confidence", label.confidence.toDouble()) })
              }
              result.pushMap(Arguments.createMap().apply {
                putDouble("x", box.left.toDouble() / bitmap.width); putDouble("y", box.top.toDouble() / bitmap.height)
                putDouble("width", box.width().toDouble() / bitmap.width); putDouble("height", box.height().toDouble() / bitmap.height)
                putArray("labels", labels)
              })
            }
            detector.close(); labeler.close()
            crops.filter { it !== bitmap }.forEach { it.recycle() }; bitmap.recycle()
            promise.resolve(result)
          }
        }.addOnFailureListener { error ->
          detector.close(); labeler.close(); bitmap.recycle(); promise.reject("OBJECT_DETECTION_FAILED", error)
        }
      } catch (error: Exception) { promise.reject("OBJECT_IMAGE_INVALID", error) }
    }.start()
  }

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
