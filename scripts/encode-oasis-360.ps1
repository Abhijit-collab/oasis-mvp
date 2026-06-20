# Stitch Oasis T1-T7 into one scrubbable 360 orbit MP4 (full quality + dense keyframes).

# Requires ffmpeg: https://ffmpeg.org/download.html

#

# Usage:

#   .\scripts\encode-oasis-360.ps1 -SourceDir ".\360-source" -Output ".\oasis-360.mp4"

#

# Upload output to S3:

#   aws s3 cp oasis-360.mp4 s3://oasis-metro/360-videos/oasis-360.mp4 --content-type video/mp4



param(

  [string]$SourceDir = ".",

  [string]$Output = "oasis-360.mp4",

  [int]$Crf = 18,

  [int]$Gop = 6,

  [switch]$AllIntra

)



$ErrorActionPreference = "Stop"



$SourceDir = (Resolve-Path $SourceDir).Path

$Output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)



$clips = @(

  "AdoptXRWeb_Transistion1.mp4",

  "AdoptXRWeb_Transistion2.mp4",

  "AdoptXRWeb_Transistion3.mp4",

  "AdoptXRWeb_Transistion4.mp4",

  "AdoptXRWeb_Transistion5.mp4",

  "AdoptXRWeb_Transistion6.mp4",

  "AdoptXRWeb_Transistion7.mp4"

)



$listFile = Join-Path $SourceDir "oasis-360-list.txt"

$lines = foreach ($c in $clips) {

  $path = Join-Path $SourceDir $c

  if (-not (Test-Path $path)) {

    Write-Error "Missing clip: $path"

  }

  # Absolute paths — ffmpeg concat resolves relative paths from the list file's folder.

  "file '$($path -replace '\\', '/')'"

}

$lines | Set-Content -Path $listFile -Encoding ASCII



$gop = if ($AllIntra) { 1 } else { $Gop }

Write-Host "Encoding $Output (CRF $Crf, GOP $gop)..." -ForegroundColor Cyan

Write-Host "Source: $SourceDir" -ForegroundColor DarkGray



$ffmpegArgs = @(

  "-y",

  "-f", "concat", "-safe", "0", "-i", $listFile,

  "-c:v", "libx264", "-pix_fmt", "yuv420p",

  "-crf", "$Crf",

  "-g", "$gop", "-keyint_min", "$gop",

  "-x264-params", "scenecut=0",

  "-movflags", "+faststart",

  "-an",

  $Output

)



& ffmpeg @ffmpegArgs

if ($LASTEXITCODE -ne 0) {

  Write-Error "ffmpeg failed (exit $LASTEXITCODE). Output was not created."

}



if (-not (Test-Path $Output)) {

  Write-Error "Expected output file not found: $Output"

}



$sizeMb = [math]::Round((Get-Item $Output).Length / 1MB, 1)

Write-Host ""

Write-Host "Done: $Output ($sizeMb MB)" -ForegroundColor Green

Write-Host "Check keyframes: ffprobe -select_streams v:0 -show_entries frame=key_frame,pkt_pts_time -of csv=p=0 `"$Output`" | Select-Object -First 20"

Write-Host "Upload: aws s3 cp `"$Output`" s3://oasis-metro/360-videos/oasis-360.mp4 --content-type video/mp4"


