$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Generating icon textures..."
python (Join-Path $Root "generate_icon_textures.py")

$blenderCandidates = @(
    "blender",
    "${env:ProgramFiles}\Blender Foundation\Blender 4.2\blender.exe",
    "${env:ProgramFiles}\Blender Foundation\Blender 4.5\blender.exe",
    "${env:ProgramFiles}\Blender Foundation\Blender 5.2\blender.exe",
    "${env:LocalAppData}\Programs\Blender Foundation\Blender 4.2\blender.exe"
)

$blender = $null
foreach ($candidate in $blenderCandidates) {
    if ($candidate -eq "blender") {
        $cmd = Get-Command blender -ErrorAction SilentlyContinue
        if ($cmd) { $blender = $cmd.Source; break }
    } elseif (Test-Path $candidate) {
        $blender = $candidate
        break
    }
}

if (-not $blender) {
    Write-Host ""
    Write-Host "Blender was not found on this machine."
    Write-Host "Install Blender 4.2+ then re-run:"
    Write-Host "  winget install BlenderFoundation.Blender.LTS.4.2"
    Write-Host "  .\blender\run_build.ps1"
    exit 1
}

Write-Host "Using Blender: $blender"
& $blender --background --python (Join-Path $Root "build_phone_social_scene.py")
