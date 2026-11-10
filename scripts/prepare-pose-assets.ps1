param(
  [string]$SourceDirectory = 'C:\Users\karta\Downloads\%E7%B6%A0%E8%89%B2%E5%A7%BF%E5%8B%A2_%E4%BF%9D%E7%95%99%E6%A8%99%E8%A8%98%E7%B7%9A_49%E5%BC%B5',
  [string]$CoupleSheet = 'C:\Users\karta\Downloads\16格情侶姿勢線稿指南.png',
  [string]$MixedSheet = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\mixed-guides.png'),
  [string]$FourSheet = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\four-guides.png'),
  [string]$SixSheet = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\six-standing.png'),
  [string]$RetrySheet = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\retry-grid.png'),
  [string]$FemaleSheetA = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\female-guide-a.png'),
  [string]$FemaleSheetB = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\female-guide-b.png'),
  [string]$FemaleSheetC = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\female-guide-c.png'),
  [string]$FemaleSheetD = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\female-guide-d.png'),
  [string]$MaleSheetA = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\male-guide-a.png'),
  [string]$MaleSheetB = (Join-Path $PSScriptRoot '..\src\assets\pose-sheets\male-guide-b.png'),
  [string]$Output = (Join-Path $PSScriptRoot '..\src\assets\poses')
)

Add-Type -AssemblyName System.Drawing

function Convert-ToOverlayPng {
  param(
    [System.Drawing.Bitmap]$Source,
    [string]$Destination,
    [switch]$RemoveTopBadge,
    [switch]$RemovePanelFrame
  )

  # Card sheets have rounded frames whose curved corners are too short for the
  # straight-line detector below. Inset framed tiles before transparency work;
  # the output padding added later restores breathing room around the figure.
  $frameInset = if ($RemovePanelFrame) { 20 } else { 0 }
  $contentWidth = $Source.Width - ($frameInset * 2)
  $contentHeight = $Source.Height - ($frameInset * 2)
  $bitmap = New-Object System.Drawing.Bitmap $contentWidth, $contentHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $contentHeight; $y++) {
    for ($x = 0; $x -lt $contentWidth; $x++) {
      $pixel = $Source.GetPixel(($x + $frameInset), ($y + $frameInset))
      $isTransparent = $pixel.A -eq 0
      $isWhite = $pixel.R -ge 238 -and $pixel.G -ge 238 -and $pixel.B -ge 238
      $isLightGrayArtifact = [Math]::Abs($pixel.R - $pixel.G) -lt 8 -and [Math]::Abs($pixel.G - $pixel.B) -lt 8 -and $pixel.R -gt 120
      $isRed = $pixel.R -gt 155 -and $pixel.R -gt ($pixel.G * 1.45) -and $pixel.R -gt ($pixel.B * 1.45)
      $isTopGreenBadge = $RemoveTopBadge -and $y -lt [int]($contentHeight * .22) -and $pixel.G -gt ($pixel.R + 4) -and $pixel.G -gt ($pixel.B + 4)
      if ($isTransparent -or $isWhite -or $isLightGrayArtifact -or $isRed -or $isTopGreenBadge) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      } else {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }

  # Remove only long straight card-border columns near the crop edge. Do not follow
  # connected pixels inward, because hands, hair, chairs, or clothing may touch them.
  foreach ($x in @(0..17 + (($bitmap.Width - 18)..($bitmap.Width - 1)))) {
    if ($x -lt 0 -or $x -ge $bitmap.Width) { continue }
    $darkCount = 0
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -gt 0 -and $pixel.R -lt 90 -and $pixel.G -lt 90 -and $pixel.B -lt 90) { $darkCount++ }
    }
    if ($darkCount -gt ($bitmap.Height * .45)) {
      for ($clearX = [Math]::Max(0, $x - 2); $clearX -le [Math]::Min($bitmap.Width - 1, $x + 2); $clearX++) {
        for ($y = 0; $y -lt $bitmap.Height; $y++) { $bitmap.SetPixel($clearX, $y, [System.Drawing.Color]::Transparent) }
      }
    }
  }
  foreach ($y in @(0..24 + (($bitmap.Height - 18)..($bitmap.Height - 1)))) {
    if ($y -lt 0 -or $y -ge $bitmap.Height) { continue }
    $darkCount = 0
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -gt 0 -and $pixel.R -lt 90 -and $pixel.G -lt 90 -and $pixel.B -lt 90) { $darkCount++ }
    }
    if ($darkCount -gt ($bitmap.Width * .45)) {
      for ($clearY = [Math]::Max(0, $y - 2); $clearY -le [Math]::Min($bitmap.Height - 1, $y + 2); $clearY++) {
        for ($x = 0; $x -lt $bitmap.Width; $x++) { $bitmap.SetPixel($x, $clearY, [System.Drawing.Color]::Transparent) }
      }
    }
  }

  $directory = Split-Path -Parent $Destination
  [System.IO.Directory]::CreateDirectory($directory) | Out-Null
  # A figure may touch a card border in the source. Never delete the entire connected
  # component; add transparent safety space so Image resizeMode=contain cannot clip strokes.
  $padding = [Math]::Max(12, [int]([Math]::Ceiling([Math]::Max($bitmap.Width, $bitmap.Height) * .05)))
  $padded = New-Object System.Drawing.Bitmap ($bitmap.Width + $padding * 2), ($bitmap.Height + $padding * 2), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($padded)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImageUnscaled($bitmap, $padding, $padding)
    $padded.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $padded.Dispose()
  }
  $bitmap.Dispose()
}

[System.IO.Directory]::CreateDirectory($Output) | Out-Null

if (Test-Path -LiteralPath $SourceDirectory) {
  $index = 0
  foreach ($sheetNumber in 1..4) {
    foreach ($file in Get-ChildItem -LiteralPath $SourceDirectory -Filter ("sheet{0}_pose*.png" -f $sheetNumber) | Sort-Object Name) {
      $index++
      $sourceBitmap = [System.Drawing.Bitmap]::FromFile($file.FullName)
      try { Convert-ToOverlayPng -Source $sourceBitmap -Destination (Join-Path $Output ('final-{0:d2}.png' -f $index)) }
      finally { $sourceBitmap.Dispose() }
    }
  }
  if ($index -ne 49) { throw "Expected 49 pose files, found $index." }
} elseif ((Get-ChildItem -LiteralPath $Output -Filter 'final-*.png').Count -ne 49) {
  throw "The 49-image source folder is unavailable and the prepared assets are incomplete."
}

if (Test-Path -LiteralPath $CoupleSheet) {
  $sheet = [System.Drawing.Bitmap]::FromFile($CoupleSheet)
  try {
    $tileWidth = [int]($sheet.Width / 4)
    $tileHeight = [int]($sheet.Height / 4)
    $coupleIndex = 0
    for ($row = 0; $row -lt 4; $row++) {
      for ($column = 0; $column -lt 4; $column++) {
        $coupleIndex++
        $x = $column * $tileWidth
        $y = $row * $tileHeight
        $width = if ($column -eq 3) { $sheet.Width - $x } else { $tileWidth }
        $height = if ($row -eq 3) { $sheet.Height - $y } else { $tileHeight }
        $crop = $sheet.Clone([System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try { Convert-ToOverlayPng -Source $crop -Destination (Join-Path $Output ('couple-{0:d2}.png' -f $coupleIndex)) -RemovePanelFrame }
        finally { $crop.Dispose() }
      }
    }
  } finally { $sheet.Dispose() }
} elseif ((Get-ChildItem -LiteralPath $Output -Filter 'couple-*.png').Count -ne 16) {
  throw "The 16-pose couple source sheet is unavailable and the prepared assets are incomplete."
}

$sheetSpecs = @(
  @{Path=$FourSheet; Columns=4; Rows=2; Prefix='four-guide'},
  @{Path=$SixSheet; Columns=3; Rows=2; Prefix='six-standing'},
  @{Path=$RetrySheet; Columns=4; Rows=2; Prefix='retry-grid'}
)

foreach ($spec in $sheetSpecs) {
  $sheet = [System.Drawing.Bitmap]::FromFile($spec.Path)
  try {
    $tileWidth = [int]($sheet.Width / $spec.Columns)
    $tileHeight = [int]($sheet.Height / $spec.Rows)
    $poseIndex = 0
    for ($row = 0; $row -lt $spec.Rows; $row++) {
      for ($column = 0; $column -lt $spec.Columns; $column++) {
        $poseIndex++
        $x = $column * $tileWidth
        $y = $row * $tileHeight
        $width = if ($column -eq ($spec.Columns - 1)) { $sheet.Width - $x } else { $tileWidth }
        $height = if ($row -eq ($spec.Rows - 1)) { $sheet.Height - $y } else { $tileHeight }
        if ($spec.Prefix -eq 'four-guide' -and $row -eq 0) { $height -= 36 }
        if ($spec.Prefix -eq 'retry-grid' -and $row -eq 0) { $height = 550 }
        if ($spec.Prefix -eq 'retry-grid' -and $row -eq 1) { $y = 550; $height = $sheet.Height - 550 }
        $crop = $sheet.Clone([System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try { Convert-ToOverlayPng -Source $crop -Destination (Join-Path $Output ('{0}-{1:d2}.png' -f $spec.Prefix, $poseIndex)) }
        finally { $crop.Dispose() }
      }
    }
  } finally { $sheet.Dispose() }
}

# The mixed guide rows overlap the mathematical thirds of the sheet. Use the
# actual visual row boundaries so feet from one row are not cut off and do not
# leak into the pose below as stray text or shapes.
$mixedSheetBitmap = [System.Drawing.Bitmap]::FromFile($MixedSheet)
try {
  $mixedRows = @(@(0,355), @(355,290), @(655,($mixedSheetBitmap.Height - 655)))
  $mixedTileWidth = [int]($mixedSheetBitmap.Width / 5)
  for ($row = 0; $row -lt 3; $row++) {
    for ($column = 0; $column -lt 5; $column++) {
      $index = ($row * 5) + $column + 1
      $x = $column * $mixedTileWidth
      $width = if ($column -eq 4) { $mixedSheetBitmap.Width - $x } else { $mixedTileWidth }
      $y = $mixedRows[$row][0]
      $height = $mixedRows[$row][1]
      $crop = $mixedSheetBitmap.Clone([System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try { Convert-ToOverlayPng -Source $crop -Destination (Join-Path $Output ('mixed-guide-{0:d2}.png' -f $index)) }
      finally { $crop.Dispose() }
    }
  }
} finally { $mixedSheetBitmap.Dispose() }

$femaleSheetSpecs = @(
  @{Path=$FemaleSheetA; Prefix='female-guide-a'; Rectangles=@(
    @(29,18,371,465), @(419,18,363,465), @(802,18,369,465),
    @(419,496,363,374), @(802,496,369,374), @(29,883,371,414), @(419,883,363,414)
  )},
  @{Path=$FemaleSheetB; Prefix='female-guide-b'; Rectangles=@(
    @(29,18,371,429), @(419,18,363,429), @(802,18,369,429),
    @(29,462,371,406), @(419,462,363,406), @(802,462,369,406),
    @(29,883,371,414), @(419,883,363,414), @(802,883,369,414)
  )},
  @{Path=$FemaleSheetC; Prefix='female-guide-c'; Rectangles=@(
    @(29,18,371,429), @(419,18,363,429), @(802,18,369,429),
    @(29,462,371,406), @(419,462,363,406), @(802,462,369,406),
    @(29,883,371,414), @(419,883,363,414), @(802,883,369,414)
  )},
  @{Path=$FemaleSheetD; Prefix='female-guide-d'; Rectangles=@(
    @(29,18,371,429), @(419,18,363,429), @(802,18,369,429),
    @(29,462,371,406), @(419,462,363,406), @(802,462,369,406),
    @(29,883,371,414), @(419,883,363,414), @(802,883,369,414)
  )}
)

foreach ($spec in $femaleSheetSpecs) {
  $sheet = [System.Drawing.Bitmap]::FromFile($spec.Path)
  try {
    for ($index = 0; $index -lt $spec.Rectangles.Count; $index++) {
      $values = $spec.Rectangles[$index]
      $rectangle = [System.Drawing.Rectangle]::new($values[0], $values[1], $values[2], $values[3])
      $crop = $sheet.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try { Convert-ToOverlayPng -Source $crop -Destination (Join-Path $Output ('{0}-{1:d2}.png' -f $spec.Prefix, ($index + 1))) -RemovePanelFrame }
      finally { $crop.Dispose() }
    }
  } finally { $sheet.Dispose() }
}

$maleSheetSpecs = @(
  @{Path=$MaleSheetA; Prefix='male-guide-a'},
  @{Path=$MaleSheetB; Prefix='male-guide-b'}
)

foreach ($spec in $maleSheetSpecs) {
  $sheet = [System.Drawing.Bitmap]::FromFile($spec.Path)
  try {
    $tileWidth = [int]($sheet.Width / 6)
    $tileHeight = [int]($sheet.Height / 3)
    for ($row = 0; $row -lt 3; $row++) {
      for ($column = 0; $column -lt 6; $column++) {
        $index = ($row * 6) + $column + 1
        $x = $column * $tileWidth
        $y = $row * $tileHeight
        $width = if ($column -eq 5) { $sheet.Width - $x } else { $tileWidth }
        $height = if ($row -eq 2) { $sheet.Height - $y } else { $tileHeight }
        $crop = $sheet.Clone([System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try { Convert-ToOverlayPng -Source $crop -Destination (Join-Path $Output ('{0}-{1:d2}.png' -f $spec.Prefix, $index)) -RemovePanelFrame }
        finally { $crop.Dispose() }
      }
    }
  } finally { $sheet.Dispose() }
}

# Some individually supplied final poses contain a continuous card-edge stroke.
# Remove only a near-edge line that runs through at least half the image; this
# cannot match a dashed guide or an ordinary limb contour.
foreach ($file in Get-ChildItem -LiteralPath $Output -Filter 'final-*.png') {
  $source = [System.Drawing.Bitmap]::FromFile($file.FullName)
  $bitmap = New-Object System.Drawing.Bitmap $source.Width, $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $copyGraphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $copyGraphics.Clear([System.Drawing.Color]::Transparent)
    $copyGraphics.DrawImageUnscaled($source, 0, 0)
  } finally {
    $copyGraphics.Dispose()
    $source.Dispose()
  }
  try {
    $edgeWidth = [Math]::Max(24, [int]($bitmap.Width * .2))
    $lineX = -1
    $bestRun = 0
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      if ($x -ge $edgeWidth -and $x -lt ($bitmap.Width - $edgeWidth)) { continue }
      $run = 0
      $longest = 0
      for ($y = 0; $y -lt $bitmap.Height; $y++) {
        if ($bitmap.GetPixel($x, $y).A -gt 0) {
          $run++
          if ($run -gt $longest) { $longest = $run }
        } else { $run = 0 }
      }
      if ($longest -gt $bestRun) { $bestRun = $longest; $lineX = $x }
    }
    if ($bestRun -gt ($bitmap.Height * .5)) {
      for ($clearX = [Math]::Max(0, $lineX - 2); $clearX -le [Math]::Min($bitmap.Width - 1, $lineX + 2); $clearX++) {
        for ($y = 0; $y -lt $bitmap.Height; $y++) { $bitmap.SetPixel($clearX, $y, [System.Drawing.Color]::Transparent) }
      }
      $bitmap.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    }
  } finally { $bitmap.Dispose() }
}

# A few source cards have a broken (rather than continuous) vertical frame.
# Their exact columns are stable in the padded output, so remove only those
# columns instead of using a looser detector that could erase a wall or chair.
$brokenFrameColumns = @{
  'final-14.png' = @(14, 18)
  'final-37.png' = @(30, 34)
  'final-43.png' = @(28, 33)
}
foreach ($entry in $brokenFrameColumns.GetEnumerator()) {
  $path = Join-Path $Output $entry.Key
  $source = [System.Drawing.Bitmap]::FromFile($path)
  $bitmap = New-Object System.Drawing.Bitmap $source.Width, $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImageUnscaled($source, 0, 0)
  } finally {
    $graphics.Dispose()
    $source.Dispose()
  }
  try {
    for ($x = $entry.Value[0]; $x -le $entry.Value[1]; $x++) {
      for ($y = 0; $y -lt $bitmap.Height; $y++) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      }
    }
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $bitmap.Dispose() }
}

Write-Output "Prepared 172 selectable transparent pose overlays with safety padding in $Output"
