$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$Root = Split-Path -Parent $PSScriptRoot
$Public = Join-Path $Root 'public'
foreach ($Size in @(16, 32, 48, 128)) {
  $Bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.Clear([System.Drawing.Color]::FromArgb(39, 76, 55))
  $FontSize = [Math]::Max(7, [Math]::Round($Size * 0.34))
  $Font = [System.Drawing.Font]::new('Arial', $FontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $Format = [System.Drawing.StringFormat]::new()
  $Format.Alignment = [System.Drawing.StringAlignment]::Center
  $Format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $Graphics.DrawString('RT', $Font, $Brush, [System.Drawing.RectangleF]::new(0, 0, $Size, $Size), $Format)
  $Bitmap.Save((Join-Path $Public "icon-$Size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $Brush.Dispose(); $Format.Dispose(); $Font.Dispose(); $Graphics.Dispose(); $Bitmap.Dispose()
}
Write-Host 'Generated extension icons.'
