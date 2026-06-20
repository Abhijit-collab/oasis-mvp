# Check whether an MP4 has dense keyframes (good for 360 scrubbing).
# Usage: .\scripts\check-keyframes.ps1 oasis-360.mp4

param([Parameter(Mandatory = $true)][string]$Video)

$frames = ffprobe -select_streams v:0 -show_entries frame=key_frame,pkt_pts_time -of csv=p=0 "$Video" 2>$null |
  Select-Object -First 30

$keyCount = ($frames | Where-Object { $_ -match "^1," }).Count
Write-Host "First 30 frames — keyframes: $keyCount"
Write-Host $frames
Write-Host ""
if ($keyCount -ge 10) {
  Write-Host "Looks good for scrubbing (dense keyframes)." -ForegroundColor Green
} else {
  Write-Host "Sparse keyframes — re-encode with scripts/encode-oasis-360.ps1 -Gop 6 (or -AllIntra)." -ForegroundColor Yellow
}
