# Reverse each T1-T7 clip and copy *-rev.mp4 to public/rev/ for local dev.
#
# Usage:
#   .\scripts\encode-oasis-360-reverse.ps1 -SourceDir ".\360-source"
#
# Upload *-rev.mp4 to S3 Transition videos/ (individual clips only; no stitched reverse file).

param(
  [string]$SourceDir = ".\360-source",
  [string]$PublicRevDir = ".\public\rev",
  [int]$Crf = 18,
  [switch]$SkipReverse
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
$SourceDir = (Resolve-Path $SourceDir).Path
$PublicRevDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PublicRevDir)

$clips = @(
  "AdoptXRWeb_Transistion1.mp4",
  "AdoptXRWeb_Transistion2.mp4",
  "AdoptXRWeb_Transistion3.mp4",
  "AdoptXRWeb_Transistion4.mp4",
  "AdoptXRWeb_Transistion5.mp4",
  "AdoptXRWeb_Transistion6.mp4",
  "AdoptXRWeb_Transistion7.mp4"
)

if (-not $SkipReverse) {
  Write-Host "Reversing individual clips..." -ForegroundColor Cyan
  foreach ($name in $clips) {
    $input = Join-Path $SourceDir $name
    if (-not (Test-Path $input)) {
      Write-Error "Missing clip: $input"
    }

    $revName = $name -replace "\.mp4$", "-rev.mp4"
    $revOut = Join-Path $SourceDir $revName
    Write-Host "  $name -> $revName"

    ffmpeg -y -i $input `
      -an `
      -vf reverse `
      -c:v libx264 -preset medium -crf $Crf -pix_fmt yuv420p `
      -movflags +faststart `
      $revOut

    if ($LASTEXITCODE -ne 0) {
      Write-Error "ffmpeg reverse failed for $name"
    }
  }
}

Write-Host "Copying *-rev.mp4 to $PublicRevDir for local dev..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $PublicRevDir | Out-Null
foreach ($name in $clips) {
  $revName = $name -replace "\.mp4$", "-rev.mp4"
  $src = Join-Path $SourceDir $revName
  Copy-Item -Force $src (Join-Path $PublicRevDir $revName)
}

Write-Host "Done. Upload *-rev.mp4 files to S3 Transition videos/" -ForegroundColor Green
