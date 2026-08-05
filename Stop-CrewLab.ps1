[CmdletBinding()]
param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtime = Join-Path $root '.crewlab\run'
if (Test-Path -LiteralPath $runtime) {
    Get-ChildItem -LiteralPath $runtime -Filter '*.pid' | ForEach-Object {
        $trackedPid = [int](Get-Content -LiteralPath $_.FullName -ErrorAction SilentlyContinue)
        if ($trackedPid) { Stop-Process -Id $trackedPid -Force -ErrorAction SilentlyContinue }
        Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }
}
Write-Host 'Da dung cac tien trinh CrewLab do nut khoi dong quan ly. Redis van chay trong Docker.'

