param(
    [string]$Blender = 'D:\Programs\BlenderPortable\blender-5.2.0-windows-x64\blender.exe',
    [string]$Toolchain = 'D:\Programs\CrewLab-3D-Toolchain'
)

$ErrorActionPreference = 'Stop'
$env:BLENDER_USER_CONFIG = Join-Path $Toolchain 'blender-config'
$env:BLENDER_USER_SCRIPTS = Join-Path $Toolchain 'blender-scripts'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$builder = Join-Path $PSScriptRoot 'build_rigged_character_prototype.py'
$animator = Join-Path $PSScriptRoot 'add_character_animation_clips.py'
$dataRoot = Join-Path $Toolchain 'mpfb-user\data'
$sourceRoot = Join-Path $Toolchain 'output\crewlab-v6-sources'
$publicRoot = Join-Path $repoRoot 'portal\public\virtual-office\characters'
$officePose = Join-Path $dataRoot 'poses\callharvey3d_sittingdefault\callharvey3d_sittingdefault.bvh'

New-Item -ItemType Directory -Force -Path $sourceRoot | Out-Null
New-Item -ItemType Directory -Force -Path $publicRoot | Out-Null

$characters = @(
    @{ Code='A01'; Gender='male'; Hair='short03'; Clothes='male_elegantsuit01'; Shoes='shoes03'; Eyebrow='eyebrow004'; Age='0.46'; Muscle='0.52'; Weight='0.48'; Height='0.55'; Proportions='0.52' },
    @{ Code='B02'; Gender='female'; Hair='bob01'; Clothes='female_casualsuit01'; Shoes='shoes01'; Eyebrow='eyebrow002'; Age='0.43'; Muscle='0.42'; Weight='0.47'; Height='0.50'; Proportions='0.48' },
    @{ Code='B03'; Gender='male'; Hair='short01'; Clothes='male_casualsuit03'; Shoes='shoes03'; Eyebrow='eyebrow006'; Age='0.40'; Muscle='0.48'; Weight='0.44'; Height='0.58'; Proportions='0.54' },
    @{ Code='D01'; Gender='female'; Hair='long01'; Clothes='female_elegantsuit01'; Shoes='shoes04'; Eyebrow='eyebrow009'; Age='0.45'; Muscle='0.40'; Weight='0.52'; Height='0.53'; Proportions='0.50' },
    @{ Code='D02'; Gender='female'; Hair='ponytail01'; Clothes='female_casualsuit02'; Shoes='shoes02'; Eyebrow='eyebrow005'; Age='0.39'; Muscle='0.46'; Weight='0.45'; Height='0.49'; Proportions='0.56' },
    @{ Code='E01'; Gender='male'; Hair='short04'; Clothes='male_worksuit01'; Shoes='shoes05'; Eyebrow='eyebrow003'; Age='0.50'; Muscle='0.58'; Weight='0.53'; Height='0.52'; Proportions='0.46' }
)

foreach ($character in $characters) {
    $code = $character.Code
    $slug = $code.ToLowerInvariant()
    Write-Host "BUILD_CHARACTER $code"
    & $Blender --background --python $builder -- `
        --output $sourceRoot `
        --data $dataRoot `
        --code $code `
        --gender $character.Gender `
        --hair $character.Hair `
        --clothes $character.Clothes `
        --shoes $character.Shoes `
        --eyebrow $character.Eyebrow `
        --age $character.Age `
        --muscle $character.Muscle `
        --weight $character.Weight `
        --height $character.Height `
        --proportions $character.Proportions `
        --pose $officePose `
        --no-render
    if ($LASTEXITCODE -ne 0) { throw "Static character build failed: $code" }

    $sourceBlend = Join-Path $sourceRoot "$slug-source.blend"
    $finalGlb = Join-Path $publicRoot "$slug.glb"
    & $Blender --background $sourceBlend --python $animator -- `
        --output $finalGlb `
        --rig "${code}_Armature" `
        --max-texture 512
    if ($LASTEXITCODE -ne 0) { throw "Animated character export failed: $code" }
}

Get-ChildItem -LiteralPath $publicRoot -Filter '*.glb' |
    Sort-Object Name |
    Select-Object Name, Length
