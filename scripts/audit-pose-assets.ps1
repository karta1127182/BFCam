param(
  [string]$InputDirectory = (Join-Path $PSScriptRoot '..\src\assets\poses'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\artifacts\pose-audit'),
  [int]$Columns = 5,
  [int]$RowsPerSheet = 8
)

Add-Type -AssemblyName System.Drawing
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null

$files = Get-ChildItem -LiteralPath $InputDirectory -Filter '*.png' | Sort-Object Name
$cellWidth = 220
$cellHeight = 260
$perSheet = $Columns * $RowsPerSheet

for ($page = 0; $page -lt [Math]::Ceiling($files.Count / $perSheet); $page++) {
  $canvas = New-Object System.Drawing.Bitmap ($cellWidth * $Columns), ($cellHeight * $RowsPerSheet), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $font = New-Object System.Drawing.Font 'Consolas', 10
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(34, 34, 34))
    for ($slot = 0; $slot -lt $perSheet; $slot++) {
      $fileIndex = ($page * $perSheet) + $slot
      if ($fileIndex -ge $files.Count) { break }
      $column = $slot % $Columns
      $row = [Math]::Floor($slot / $Columns)
      $left = $column * $cellWidth
      $top = $row * $cellHeight
      $image = [System.Drawing.Bitmap]::FromFile($files[$fileIndex].FullName)
      try {
        $availableWidth = $cellWidth - 16
        $availableHeight = $cellHeight - 34
        $scale = [Math]::Min($availableWidth / $image.Width, $availableHeight / $image.Height)
        $width = [int]($image.Width * $scale)
        $height = [int]($image.Height * $scale)
        $x = $left + [int](($cellWidth - $width) / 2)
        $y = $top + 4 + [int](($availableHeight - $height) / 2)
        $graphics.DrawImage($image, $x, $y, $width, $height)
        $graphics.DrawString($files[$fileIndex].Name, $font, [System.Drawing.Brushes]::White, $left + 6, $top + $cellHeight - 25)
        $graphics.DrawRectangle([System.Drawing.Pens]::DimGray, $left, $top, $cellWidth - 1, $cellHeight - 1)
      } finally { $image.Dispose() }
    }
    $destination = Join-Path $OutputDirectory ('poses-{0:d2}.png' -f ($page + 1))
    $canvas.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $font.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
  }
}

Write-Output ("Created {0} audit sheets for {1} pose assets in {2}" -f [Math]::Ceiling($files.Count / $perSheet), $files.Count, $OutputDirectory)
