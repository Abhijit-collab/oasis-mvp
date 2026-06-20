# Encode reversed T1-T7 clips for smooth back transitions (forward play of -rev.mp4).
# Requires ffmpeg: https://ffmpeg.org/download.html
#
# Usage:
#   .\scripts\encode-reverse-transitions.ps1 -SourceDir ".\360-source"
#
# Upload outputs to S3 alongside originals, e.g.:
#   AdoptXRWeb_Transistion1-rev.mp4

param(
  [string]$SourceDir = ".\360-source",
  [int]$Crf = 18
)

$ErrorActionPreference = "Stop"
$SourceDir = (Resolve-Path $SourceDir).Path

$inputs = @(
  "AdoptXRWeb_Transistion1.mp4",
  "AdoptXRWeb_Transistion2.mp4",
  "AdoptXRWeb_Transistion3.mp4",
  "AdoptXRWeb_Transistion4.mp4",
  "AdoptXRWeb_Transistion5.mp4",
  "AdoptXRWeb_Transistion6.mp4",
  "AdoptXRWeb_Transistion7.mp4"
)

foreach ($name in $inputs) {
  $input = Join-Path $SourceDir $name
  if (-not (Test-Path $input)) {
    Write-Warning "Skip (missing): $input"
    continue
  }

  $output = Join-Path $SourceDir ($name -replace "\.mp4$", "-rev.mp4")
  Write-Host "Reversing $name -> $(Split-Path $output -Leaf)"

  ffmpeg -y -i $input `
    -an `
    -vf reverse `
    -c:v libx264 -preset slow -crf $Crf -pix_fmt yuv420p `
    -movflags +faststart `
    $output
}

Write-Host "Done. Upload *-rev.mp4 files to Transition videos/ on S3."
