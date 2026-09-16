import {ClipOp, FillType, ImageFormat, Skia, TileMode} from '@shopify/react-native-skia';
import {Images} from 'react-native-nitro-image';
import type {Photo} from 'react-native-vision-camera';
import {centerCropRect, localizedBrightnessMatrix, localizedRosyMatrix, type FaceRegion, type PhotoGeometry, type RetouchSettings} from './index';
import {makeFaceReshapeLayer} from './faceReshape';

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

export async function saveEditedPhoto(sourcePath: string, matrix: number[], geometry: PhotoGeometry, retouch: RetouchSettings) {
  const source = await Images.loadFromFileAsync(sourcePath);
  const owned: Array<typeof source> = [];
  try {
    let transformed = source;
    let faces = retouch.faces.map(face => ({...face, region: {...face.region}, eyes: face.eyes.map(region => ({...region})), nose: face.nose ? {...face.nose} : undefined, mouth: face.mouth ? {...face.mouth} : undefined, skinMask: face.skinMask ? {outer: face.skinMask.outer.map(point => ({...point})), exclusions: face.skinMask.exclusions.map(points => points.map(point => ({...point})))} : undefined, underEyes: face.underEyes.map(region => ({...region}))}));
    let healSpots = retouch.healSpots.map(spot => ({...spot}));
    let regionWidth = source.width;
    let regionHeight = source.height;
    if (geometry.rotation !== 0) {
      transformed = source.rotate(geometry.rotation, false);
      owned.push(transformed);
      const rotateRegion = (region: FaceRegion) => {
        if (geometry.rotation === 90) return {x: regionHeight - region.y - region.height, y: region.x, width: region.height, height: region.width};
        if (geometry.rotation === 180) return {x: regionWidth - region.x - region.width, y: regionHeight - region.y - region.height, width: region.width, height: region.height};
        return {x: region.y, y: regionWidth - region.x - region.width, width: region.height, height: region.width};
      };
      const rotatePoint = (point: {x: number; y: number}) => geometry.rotation === 90 ? {x: regionHeight - point.y, y: point.x} : geometry.rotation === 180 ? {x: regionWidth - point.x, y: regionHeight - point.y} : {x: point.y, y: regionWidth - point.x};
      faces = faces.map(face => ({...face, region: rotateRegion(face.region), eyes: face.eyes.map(rotateRegion), nose: face.nose ? rotateRegion(face.nose) : undefined, mouth: face.mouth ? rotateRegion(face.mouth) : undefined, underEyes: face.underEyes.map(rotateRegion), skinMask: face.skinMask ? {outer: face.skinMask.outer.map(rotatePoint), exclusions: face.skinMask.exclusions.map(points => points.map(rotatePoint))} : undefined}));
      healSpots = healSpots.map(spot => {const target = rotatePoint(spot); const sourcePoint = rotatePoint({x: spot.sourceX, y: spot.sourceY}); return {...spot, ...target, sourceX: sourcePoint.x, sourceY: sourcePoint.y};});
      if (geometry.rotation === 90 || geometry.rotation === 270) [regionWidth, regionHeight] = [regionHeight, regionWidth];
    }
    if (geometry.mirrored) {
      transformed = transformed.mirrorHorizontally();
      owned.push(transformed);
      const mirrorRegion = (region: FaceRegion) => ({...region, x: regionWidth - region.x - region.width});
      faces = faces.map(face => ({...face, region: mirrorRegion(face.region), eyes: face.eyes.map(mirrorRegion), nose: face.nose ? mirrorRegion(face.nose) : undefined, mouth: face.mouth ? mirrorRegion(face.mouth) : undefined, underEyes: face.underEyes.map(mirrorRegion), skinMask: face.skinMask ? {outer: face.skinMask.outer.map(point => ({x: regionWidth - point.x, y: point.y})), exclusions: face.skinMask.exclusions.map(points => points.map(point => ({x: regionWidth - point.x, y: point.y})))} : undefined}));
      healSpots = healSpots.map(spot => ({...spot, x: regionWidth - spot.x, sourceX: regionWidth - spot.sourceX}));
    }
    if (geometry.cropAspect !== 'original') {
      const rect = centerCropRect(transformed.width, transformed.height, geometry.cropAspect);
      transformed = transformed.crop(rect.startX, rect.startY, rect.endX, rect.endY);
      owned.push(transformed);
      const cropRegion = (region: FaceRegion) => ({...region, x: region.x - rect.startX, y: region.y - rect.startY});
      faces = faces.map(face => ({...face, region: cropRegion(face.region), eyes: face.eyes.map(cropRegion), nose: face.nose ? cropRegion(face.nose) : undefined, mouth: face.mouth ? cropRegion(face.mouth) : undefined, underEyes: face.underEyes.map(cropRegion), skinMask: face.skinMask ? {outer: face.skinMask.outer.map(point => ({x: point.x - rect.startX, y: point.y - rect.startY})), exclusions: face.skinMask.exclusions.map(points => points.map(point => ({x: point.x - rect.startX, y: point.y - rect.startY})))} : undefined}));
      healSpots = healSpots.map(spot => ({...spot, x: spot.x - rect.startX, y: spot.y - rect.startY, sourceX: spot.sourceX - rect.startX, sourceY: spot.sourceY - rect.startY}));
      regionWidth = rect.endX - rect.startX;
      regionHeight = rect.endY - rect.startY;
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
      let reshapeLayer: ReturnType<typeof makeFaceReshapeLayer> = null;
      try {
        paint.setColorFilter(colorFilter);
        const canvas = surface.getCanvas();
        reshapeLayer = makeFaceReshapeLayer(faces);
        if (reshapeLayer) canvas.saveLayer(reshapeLayer.paint);
        canvas.drawImage(image, 0, 0, paint);
        for (const face of faces) {
          const region = face.region;
          const clipped = {x: Math.max(0, region.x), y: Math.max(0, region.y), width: Math.min(region.width, regionWidth - Math.max(0, region.x)), height: Math.min(region.height, regionHeight - Math.max(0, region.y))};
          if (clipped.width <= 0 || clipped.height <= 0) continue;
          const clipFace = () => {
            if (face.skinMask?.outer.length) {
              const pathValue = Skia.Path.Make();
              pathValue.setFillType(FillType.EvenOdd);
              pathValue.addPoly(face.skinMask.outer, true);
              face.skinMask.exclusions.forEach(points => pathValue.addPoly(points, true));
              canvas.clipPath(pathValue, ClipOp.Intersect, true);
              pathValue.dispose();
            } else canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(clipped.x, clipped.y, clipped.width, clipped.height), clipped.width * .45, clipped.height * .45), ClipOp.Intersect, true);
          };
          const smoothing = Math.max(0, Math.min(1, face.smoothing));
          if (smoothing > 0) {
          const blurPaint = Skia.Paint();
          const blurColorFilter = Skia.ColorFilter.MakeMatrix(matrix);
          const blurFilter = Skia.ImageFilter.MakeBlur(Math.max(1, image.width() * .0025 * smoothing), Math.max(1, image.width() * .0025 * smoothing), TileMode.Clamp);
          try {
            blurPaint.setColorFilter(blurColorFilter);
            blurPaint.setImageFilter(blurFilter);
            blurPaint.setAlphaf(Math.min(.72, smoothing * .72));
            canvas.save(); clipFace(); canvas.drawImage(image, 0, 0, blurPaint); canvas.restore();
          } finally {
            blurPaint.dispose(); blurColorFilter.dispose(); blurFilter.dispose();
          }
        }
          const whitening = Math.max(0, Math.min(1, face.whitening));
          if (whitening > 0) {
          const whiteningPaint = Skia.Paint();
          const whiteningColorFilter = Skia.ColorFilter.MakeMatrix(localizedBrightnessMatrix(matrix, whitening * .72));
          try {
            whiteningPaint.setColorFilter(whiteningColorFilter);
            whiteningPaint.setAlphaf(Math.min(.65, whitening * .65));
            canvas.save(); clipFace(); canvas.drawImage(image, 0, 0, whiteningPaint); canvas.restore();
          } finally {
            whiteningPaint.dispose(); whiteningColorFilter.dispose();
          }
        }
          const rosy = Math.max(0, Math.min(1, face.rosy));
          if (rosy > 0) {
            const rosyPaint = Skia.Paint(); const rosyFilter = Skia.ColorFilter.MakeMatrix(localizedRosyMatrix(matrix, rosy));
            try { rosyPaint.setColorFilter(rosyFilter); rosyPaint.setAlphaf(Math.min(.62, rosy * .62)); canvas.save(); clipFace(); canvas.drawImage(image, 0, 0, rosyPaint); canvas.restore(); }
            finally { rosyPaint.dispose(); rosyFilter.dispose(); }
          }
          const applyBrightening = (regions: FaceRegion[], amount: number, opacity: number) => {
            if (amount <= 0) return;
            const localPaint = Skia.Paint(); const localFilter = Skia.ColorFilter.MakeMatrix(localizedBrightnessMatrix(matrix, amount));
            try {
              localPaint.setColorFilter(localFilter); localPaint.setAlphaf(opacity);
              for (const localRegion of regions) {
                if (localRegion.width <= 0 || localRegion.height <= 0) continue;
                canvas.save(); canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(localRegion.x, localRegion.y, localRegion.width, localRegion.height), localRegion.width * .48, localRegion.height * .48), ClipOp.Intersect, true); canvas.drawImage(image, 0, 0, localPaint); canvas.restore();
              }
            } finally { localPaint.dispose(); localFilter.dispose(); }
          };
          const brightEyes = Math.max(0, Math.min(1, face.brightEyes));
          applyBrightening(face.eyes, brightEyes * .7, Math.min(.7, brightEyes * .7));
          const teethWhitening = Math.max(0, Math.min(1, face.teethWhitening));
          applyBrightening(face.mouth ? [face.mouth] : [], teethWhitening * .85, Math.min(.55, teethWhitening * .55));
          const darkCircle = Math.max(0, Math.min(1, face.darkCircle));
          if (darkCircle > 0) {
          const eyePaint = Skia.Paint();
          const eyeColorFilter = Skia.ColorFilter.MakeMatrix(localizedBrightnessMatrix(matrix, darkCircle));
          try {
            eyePaint.setColorFilter(eyeColorFilter);
            for (const eyeRegion of face.underEyes) {
              const eyeClip = {x: Math.max(0, eyeRegion.x), y: Math.max(0, eyeRegion.y), width: Math.min(eyeRegion.width, regionWidth - Math.max(0, eyeRegion.x)), height: Math.min(eyeRegion.height, regionHeight - Math.max(0, eyeRegion.y))};
              if (eyeClip.width <= 0 || eyeClip.height <= 0) continue;
              canvas.save();
              canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(eyeClip.x, eyeClip.y, eyeClip.width, eyeClip.height), eyeClip.width * .5, eyeClip.height * .5), ClipOp.Intersect, true);
              canvas.drawImage(image, 0, 0, eyePaint);
              canvas.restore();
            }
          } finally {
            eyePaint.dispose(); eyeColorFilter.dispose();
          }
        }
        }
        for (const spot of healSpots) {
          if (spot.x + spot.radius < 0 || spot.y + spot.radius < 0 || spot.x - spot.radius > regionWidth || spot.y - spot.radius > regionHeight) continue;
          const healPaint = Skia.Paint();
          const healColorFilter = Skia.ColorFilter.MakeMatrix(matrix);
          const healBlur = Skia.ImageFilter.MakeBlur(Math.max(1, spot.radius * .1), Math.max(1, spot.radius * .1), TileMode.Clamp);
          try {
            healPaint.setColorFilter(healColorFilter);
            healPaint.setImageFilter(healBlur);
            healPaint.setAlphaf(Math.max(0, Math.min(1, spot.strength)));
            canvas.save();
            canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(spot.x - spot.radius, spot.y - spot.radius, spot.radius * 2, spot.radius * 2), spot.radius, spot.radius), ClipOp.Intersect, true);
            canvas.drawImage(image, spot.x - spot.sourceX, spot.y - spot.sourceY, healPaint);
            canvas.restore();
          } finally { healPaint.dispose(); healColorFilter.dispose(); healBlur.dispose(); }
        }
        if (reshapeLayer) {
          canvas.restore();
          reshapeLayer.paint.dispose();
          reshapeLayer.filter.dispose();
          reshapeLayer = null;
        }
        surface.flush();
        const snapshot = surface.makeImageSnapshot();
        try {
          const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);
          const result = await Images.loadFromEncodedImageDataAsync({buffer: new Uint8Array(bytes).buffer, width: image.width(), height: image.height(), imageFormat: 'jpg'});
          try { return await result.saveToTemporaryFileAsync('jpg', 95); }
          finally { result.dispose(); }
        } finally { snapshot.dispose(); }
      } finally {
        reshapeLayer?.paint.dispose();
        reshapeLayer?.filter.dispose();
        paint.dispose(); colorFilter.dispose(); surface.dispose();
      }
    } finally {
      image?.dispose();
      data.dispose();
    }
  } finally {
    for (let index = owned.length - 1; index >= 0; index--) owned[index].dispose();
    source.dispose();
  }
}
