# Nitro registers Java/Kotlin classes and callbacks from C++ by their original
# names, including generated camera/image bridge types and constructors.
# Retain this native boundary; other application/dependency code remains eligible
# for shrinking, optimization and obfuscation.
-keep class com.margelo.nitro.** { *; }

# Skia calls platform/view helpers from native drawing and image-export code.
-keep class com.shopify.reactnative.skia.** { *; }

# Custom legacy React Native modules export these methods to JavaScript.
# Keep these two small bridges explicitly rather than keeping all com.bfcam code.
-keep class com.bfcam.PoseDetectionModule { *; }
-keep class com.bfcam.TrialReminderModule { *; }

# ML Kit discovers registrars from AndroidManifest metadata and constructs them
# through reflection. firebase-components 16.1.0 only keeps the class itself;
# R8 full mode otherwise removes its no-argument constructor, leaving detectors
# unregistered and causing FaceDetection.getClient() to fail at startup.
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
    public java.util.List getComponents();
}

# Keep source/line information for retracing production crashes with mapping.txt.
-keepattributes SourceFile,LineNumberTable
