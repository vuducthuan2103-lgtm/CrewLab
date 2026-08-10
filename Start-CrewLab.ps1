[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$portal = Join-Path $root 'portal'
$internal = Join-Path $root 'internal-app'
$runtime = Join-Path $root '.crewlab\run'
$logs = Join-Path $root '.crewlab\logs'
New-Item -ItemType Directory -Force -Path $runtime, $logs | Out-Null

function Write-Step([string]$message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Normalize-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    [Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
    [Environment]::SetEnvironmentVariable('Path', "$machinePath;$userPath", 'Process')
}

function Test-Url([string]$url, [int]$timeoutSeconds = 3) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSeconds
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Wait-Url([string]$name, [string]$url, [int]$maxSeconds = 45) {
    $deadline = (Get-Date).AddSeconds($maxSeconds)
    do {
        if (Test-Url $url) {
            Write-Host "[OK] $name - $url" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Milliseconds 750
    } while ((Get-Date) -lt $deadline)
    Write-Host "[LOI] $name chua san sang - xem thu muc .crewlab\logs" -ForegroundColor Red
    return $false
}

function Test-DockerEngine {
    $docker = Get-Command docker.exe -ErrorAction SilentlyContinue
    if (-not $docker) { return $false }

    & docker.exe info 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Get-DockerDesktopPath {
    $candidates = @()
    $docker = Get-Command docker.exe -ErrorAction SilentlyContinue
    if ($docker -and $docker.Source) {
        $cliDirectory = Split-Path -Parent $docker.Source
        $resourcesDirectory = Split-Path -Parent $cliDirectory
        $installDirectory = Split-Path -Parent $resourcesDirectory
        $candidates += Join-Path $installDirectory 'Docker Desktop.exe'
    }

    $programFiles = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)
    if ($programFiles) {
        $candidates += Join-Path $programFiles 'Docker\Docker\Docker Desktop.exe'
    }
    $candidates += 'D:\Programs\DockerDesktop\Docker Desktop.exe'

    return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function Invoke-Docker([string[]]$argumentList, [string]$failureMessage) {
    & docker.exe @argumentList | Out-Null
    if ($LASTEXITCODE -ne 0) { throw $failureMessage }
}

function Get-ListenerPid([int]$port) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener) { return [int]$listener.OwningProcess }
    return $null
}

function Stop-NodeListener([int]$port) {
    $listenerPid = Get-ListenerPid $port
    if (-not $listenerPid) { return }
    try {
        $process = Get-Process -Id $listenerPid -ErrorAction Stop
        if ($process.ProcessName -eq 'node') {
            Stop-Process -Id $listenerPid -Force
        } else {
            throw "Cong $port dang duoc tien trinh $($process.ProcessName) su dung."
        }
    } catch {
        throw "Khong the giai phong cong $port. Hay dong ung dung dang giu cong nay roi chay lai."
    }
}

function Stop-TrackedProcess([string]$name) {
    $pidFile = Join-Path $runtime "$name.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) { return }
    $trackedPid = [int](Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue)
    if ($trackedPid) {
        Stop-Process -Id $trackedPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

function Start-TrackedProcess(
    [string]$name,
    [string]$filePath,
    [string[]]$argumentList,
    [string]$workingDirectory
) {
    $stdout = Join-Path $logs "$name.log"
    $stderr = Join-Path $logs "$name-error.log"
    $process = Start-Process -FilePath $filePath -ArgumentList $argumentList `
        -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    Set-Content -LiteralPath (Join-Path $runtime "$name.pid") -Value $process.Id
    return $process.Id
}

function Set-FrontendApiUrl([string]$file, [int]$apiPort) {
    $line = "NEXT_PUBLIC_API_URL=http://localhost:$apiPort"
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Thieu file cau hinh $file"
    }
    $content = Get-Content -LiteralPath $file
    if ($content -match '^NEXT_PUBLIC_API_URL=') {
        $content = $content | ForEach-Object {
            if ($_ -match '^NEXT_PUBLIC_API_URL=') { $line } else { $_ }
        }
    } else {
        $content += $line
    }
    Set-Content -LiteralPath $file -Value $content -Encoding utf8
}

function Test-Spec0010Backend([int]$port) {
    try {
        $openApi = Invoke-RestMethod -Uri "http://localhost:$port/openapi.json" -TimeoutSec 3
        $routes = $openApi.paths.PSObject.Properties.Name
        return $routes -contains '/api/v1/internal/clients'
    } catch {
        return $false
    }
}

Normalize-ProcessPath

Write-Step 'Kiem tra Docker va Redis'
if (-not (Test-DockerEngine)) {
    $dockerDesktop = Get-DockerDesktopPath
    if ((-not $dockerDesktop) -or (-not (Test-Path -LiteralPath $dockerDesktop))) {
        throw 'Docker Desktop chua duoc cai hoac khong tim thay.'
    }
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    $dockerReady = $false
    $deadline = (Get-Date).AddSeconds(55)
    do {
        Start-Sleep -Seconds 2
        $dockerReady = Test-DockerEngine
    } while (-not $dockerReady -and (Get-Date) -lt $deadline)
    if (-not $dockerReady) { throw 'Docker Engine chua san sang sau 55 giay.' }
}

& docker.exe inspect crewlab-redis 2>$null | Out-Null
$redisExists = ($LASTEXITCODE -eq 0)
if (-not $redisExists) {
    Invoke-Docker @('run', '-d', '--name', 'crewlab-redis', '--restart', 'unless-stopped', '-p', '6379:6379', 'redis:7-alpine') 'Khong the tao Redis container.'
} else {
    Invoke-Docker @('update', '--restart', 'unless-stopped', 'crewlab-redis') 'Khong the cap nhat Redis container.'
    Invoke-Docker @('start', 'crewlab-redis') 'Khong the khoi dong Redis container.'
}
Write-Host '[OK] Redis se tu khoi dong cung Docker' -ForegroundColor Green

Write-Step 'Chon cong backend an toan'
$apiPort = 8000
$reuseBackend = $false
if (Get-ListenerPid 8000) {
    if (Test-Spec0010Backend 8000) {
        $reuseBackend = $true
    } elseif (Test-Spec0010Backend 8001) {
        $apiPort = 8001
        $reuseBackend = $true
    } elseif (-not (Get-ListenerPid 8001)) {
        $apiPort = 8001
    } else {
        throw 'Ca cong 8000 va 8001 deu dang bi ung dung khac su dung.'
    }
}
Set-FrontendApiUrl (Join-Path $portal '.env.local') $apiPort
Set-FrontendApiUrl (Join-Path $internal '.env.local') $apiPort

Write-Step 'Khoi dong Backend, Portal va Internal App'
$python = Join-Path $backend 'venv\Scripts\python.exe'
$node = 'D:\Program files\nodejs\node.exe'
if (-not (Test-Path -LiteralPath $node)) { $node = (Get-Command node.exe).Source }

if (-not $reuseBackend) {
    Stop-TrackedProcess 'backend'
    Start-TrackedProcess 'backend' $python @('-m', 'uvicorn', 'app.main:app', '--port', "$apiPort") $backend | Out-Null
}

Stop-TrackedProcess 'portal'
Stop-TrackedProcess 'internal-app'
Stop-NodeListener 3000
Stop-NodeListener 3001
$portalNext = Join-Path $portal 'node_modules\next\dist\bin\next'
$internalNext = Join-Path $internal 'node_modules\next\dist\bin\next'
Start-TrackedProcess 'portal' $node @("`"$portalNext`"", 'dev', '-p', '3000') $portal | Out-Null
Start-TrackedProcess 'internal-app' $node @("`"$internalNext`"", 'dev', '-p', '3001') $internal | Out-Null

Write-Step 'Khoi dong Celery Worker va Beat'
Stop-TrackedProcess 'celery-worker'
Stop-TrackedProcess 'celery-beat'
Push-Location $backend
try {
    try { & $python -m celery -A app.core.celery_app:celery_app control shutdown 2>$null | Out-Null } catch {}
} finally {
    Pop-Location
}
$workerLog = Join-Path $logs 'celery-worker.log'
$beatLog = Join-Path $logs 'celery-beat.log'
$beatPid = Join-Path $runtime 'celerybeat.pid'
Remove-Item -LiteralPath $beatPid -Force -ErrorAction SilentlyContinue
$worker = Start-Process -FilePath $python -ArgumentList @(
    '-m', 'celery', '-A', 'app.core.celery_app:celery_app', 'worker',
    '--loglevel=info', '--pool=solo', '--hostname=crewlab-local@%h', "--logfile=`"$workerLog`""
) -WorkingDirectory $backend -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $runtime 'celery-worker.pid') -Value $worker.Id
$beat = Start-Process -FilePath $python -ArgumentList @(
    '-m', 'celery', '-A', 'app.core.celery_app:celery_app', 'beat',
    '--loglevel=info', "--pidfile=`"$beatPid`"", "--logfile=`"$beatLog`""
) -WorkingDirectory $backend -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $runtime 'celery-beat.pid') -Value $beat.Id

Write-Step 'Kiem tra toan bo he thong'
$checks = @()
$checks += Wait-Url 'Portal' 'http://localhost:3000/login'
$checks += Wait-Url 'Internal App' 'http://localhost:3001/login'
$checks += Wait-Url 'Backend API' "http://localhost:$apiPort/health"

$workerReady = $false
Push-Location $backend
try {
    $ping = & $python -m celery -A app.core.celery_app:celery_app inspect ping --timeout=8 2>&1
    $workerReady = ($ping -join "`n") -match 'pong'
} catch {
} finally {
    Pop-Location
}
if ($workerReady) {
    Write-Host '[OK] Celery Worker - pong' -ForegroundColor Green
} else {
    Write-Host '[LOI] Celery Worker chua tra pong' -ForegroundColor Red
}
$beatReady = -not $beat.HasExited
if ($beatReady) {
    Write-Host '[OK] Celery Beat dang chay' -ForegroundColor Green
} else {
    Write-Host '[LOI] Celery Beat da dung' -ForegroundColor Red
}

Write-Host "`nCrewLab da khoi dong:" -ForegroundColor Yellow
Write-Host 'Portal:      http://localhost:3000/login'
Write-Host 'Internal:    http://localhost:3001/login'
Write-Host "Backend API: http://localhost:$apiPort/health"
Write-Host 'Logs:        .crewlab\logs'

if ($checks -contains $false -or -not $workerReady -or -not $beatReady) {
    exit 1
}
