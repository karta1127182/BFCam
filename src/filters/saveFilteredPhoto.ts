import {ImageFormat, Skia} from '@shopify/react-native-skia';
import {Images} from 'react-native-nitro-image';
import type {Photo} from 'react-native-vision-camera';
import {centerCropRect, type PhotoGeometry} from './index';

export async function saveFilteredPhoto(photo: Photo, matrix: number[]) {
  // Decode through Photo first so the camera's EXIF orientation is applied.
  const oriented = await photo.toImageAsync();
  let encoded: Awaited<ReturnType<typeof oriented.toEncodedImageDataAsync>>;
  try { encoded = await oriented.toEncodedImageDataAsync('png'); }
  finally { oriented.dispose(); }
  const data = Skia.Data.fromBytes(new Uint8Array(encoded.buffer));
  const image = Skia.Image.MakeImageFromEncoded(data);
  try {
    if (!image) throw new Error('無法解碼照片');
    const surface = Skia.Surface.MakeOffscreen(image.width(), image.height());
    if (!surface) throw new Error('無法建立濾鏡影像');
    const paint = Skia.Paint();
    const colorFilter = Skia.ColorFilter.MakeMatrix(matrix);
    try {
      paint.setColorFilter(colorFilter);
      surface.getCanvas().drawImage(image, 0, 0, paint);
      surface.flush();
      const snapshot = surface.makeImageSnapshot();
      try {
        const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);
        const result = await Images.loadFromEncodedImageDataAsync({buffer: new Uint8Array(bytes).buffer, width: image.width(), height: image.height(), imageFormat: 'jpg'});
        try { return await result.saveToTemporaryFileAsync('jpg', 95); }
        finally { result.dispose(); }
      } finally { snapshot.dispose(); }
    } finally { paint.dispose(); colorFilter.dispose(); surface.dispose(); }
  } finally { image?.dispose(); data.dispose(); }
}

export async function saveEditedPhoto(sourcePath: string, matrix: number[], geometry: PhotoGeometry) {
  const source = await Images.loadFromFileAsync(sourcePath);
  const owned: Array<typeof source> = [];
  try {
    let transformed = source;
    if (geometry.rotation !== 0) {
      transformed = source.rotate(geometry.rotation, false);
      owned.push(transformed);
    }
    if (geometry.mirrored) {
      transformed = transformed.mirrorHorizontally();
      owned.push(transformed);
    }
    if (geometry.cropAspect !== 'original') {
      const rect = centerCropRect(transformed.width, transformed.height, geometry.cropAspect);
      transformed = transformed.crop(rect.startX, rect.startY, rect.endX, rect.endY);
      owned.push(transformed);
    }
    const encoded = await transformed.toEncodedImageDataAsync('png');
    const data = Skia.Data.fromBytes(new Uint8Array(encoded.buffer));
    const image = Skia.Image.MakeImageFromEncoded(data);
    try {
      if (!image) throw new Error('無法解碼照片');
      const surface = Skia.Surface.MakeOffscreen(image.width(), image.height());
      if (!surface) throw new Error('無法建立修圖影像');
      const paint = Skia.Paint();
      const colorFilter = Skia.ColorFilter.MakeMatrix(matrix);
      try {
        paint.setColorFilter(colorFilter);
        const canvas = surface.getCanvas();
        const heightScale = Math.max(1, Math.min(1.15, Number.isFinite(geometry.heightScale) ? geometry.heightScale : 1));
        if (heightScale !== 1) {
          canvas.translate(0, image.height() / 2);
          canvas.scale(1, heightScale);
          canvas.translate(0, -image.height() / 2);
        }
        canvas.drawImage(image, 0, 0, paint);
        surface.flush();
        const snapshot = surface.makeImageSnapshot();
        try {
          const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);
          const result = await Images.loadFromEncodedImageDataAsync({buffer: new Uint8Array(bytes).buffer, width: image.width(), height: image.height(), imageFormat: 'jpg'});
          try { return await result.saveToTemporaryFileAsync('jpg', 95); }
          finally { result.dispose(); }
        } finally { snapshot.dispose(); }
      } finally { paint.dispose(); colorFilter.dispose(); surface.dispose(); }
    } finally {
      image?.dispose();
      data.dispose();
    }
  } finally {
    for (let index = owned.length - 1; index >= 0; index--) owned[index].dispose();
    source.dispose();
  }
}
