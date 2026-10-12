# OrbitLink Automated 2-Minute Git Sync Launcher
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting OrbitLink Auto-Git Sync Daemon " -ForegroundColor Cyan
Write-Host " Checks & pushes to GitHub every 2 mins  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptPath = Join-Path $PSScriptRoot "auto_git_sync.py"
& python $ScriptPath
