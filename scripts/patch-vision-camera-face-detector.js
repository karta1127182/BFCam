const fs = require('fs');
const path = require('path');

const detectorPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-vision-camera-face-detector',
  'android',
  'src',
  'main',
  'java',
  'com',
  'margelo',
  'nitro',
  'camera',
  'facedetector',
  'HybridImageFaceDetector.kt',
);

const brokenImplementation = `  private fun resolveInputImage(
    input: Any?
  ): String {
    return when (input) {
      is String -> input
      is Map<*, *> -> {
        val uri = input["uri"] as? String
        uri ?: throw IllegalArgumentException("Invalid image object: missing 'uri'")
      }
      else -> throw IllegalArgumentException("Invalid image type. Expected string or { uri }")
    }
  }`;

const fixedImplementation = `  private fun resolveInputImage(
    input: InputImage
  ): String {
    return input.match(
      first = { it },
      second = { throw IllegalArgumentException("Numeric image resources are not supported on Android") },
      third = { it.uri }
    )
  }`;

if (!fs.existsSync(detectorPath)) {
  throw new Error(`Face detector source was not found at ${detectorPath}`);
}

const source = fs.readFileSync(detectorPath, 'utf8');
if (source.includes(fixedImplementation)) {
  console.log('VisionCamera face detector Android patch is already applied.');
} else if (source.includes(brokenImplementation)) {
  fs.writeFileSync(
    detectorPath,
    source.replace(brokenImplementation, fixedImplementation),
    'utf8',
  );
  console.log('Patched VisionCamera face detector Android InputImage handling.');
} else {
  throw new Error(
    'VisionCamera face detector source changed; review the Android InputImage patch.',
  );
}
