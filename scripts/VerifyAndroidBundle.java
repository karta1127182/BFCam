import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.*;
import java.util.*;
import java.util.jar.*;

// Uses JDK JarFile verification on every payload, not just the presence of META-INF signatures.
class VerifyAndroidBundle {
  public static void main(String[] args) throws Exception {
    var factory = CertificateFactory.getInstance("X.509");
    byte[] expected;
    try (var input = Files.newInputStream(Path.of(args[1]))) {
      expected = factory.generateCertificate(input).getEncoded();
    }
    int verified = 0;
    try (var jar = new JarFile(args[0], true)) {
      for (var entry : Collections.list(jar.entries())) {
        if (entry.isDirectory()) continue;
        try (var input = jar.getInputStream(entry)) { input.transferTo(OutputStream.nullOutputStream()); }
        String name = entry.getName().toUpperCase(Locale.ROOT);
        if (name.equals("META-INF/MANIFEST.MF") || name.matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)")) continue;
        var signers = entry.getCodeSigners();
        if (signers == null || signers.length != 1 || !Arrays.equals(expected, signers[0].getSignerCertPath().getCertificates().get(0).getEncoded())) {
          throw new SecurityException("Missing or unexpected signature: " + entry.getName());
        }
        verified++;
      }
    }
    System.out.println("All " + verified + " payload entries verified with the expected upload certificate.");
    System.out.println("Certificate SHA-256: " + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(expected)));
  }
}
