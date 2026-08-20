$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$versionFile = Join-Path $androidRoot 'version.properties'
$generatedApk = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$outputApk = Join-Path $projectRoot 'wm-personal-blog-debug.apk'

if (-not (Test-Path -LiteralPath $versionFile)) {
  throw "Android version file was not found at $versionFile."
}

$versionProperties = @{}
Get-Content -LiteralPath $versionFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') {
    $versionProperties[$matches[1]] = $matches[2]
  }
}

$currentVersionName = $versionProperties['VERSION_NAME']
$currentVersionCode = $versionProperties['VERSION_CODE']
if ($currentVersionName -match '^(\d+)\.(\d+)\.(\d+)$') {
  $versionMajor = [int]$matches[1]
  $versionMinor = [int]$matches[2]
  $versionPatch = [int]$matches[3]
} else {
  throw "VERSION_NAME must use three numeric parts, for example 1.1.1. Current value: $currentVersionName"
}
if ($currentVersionCode -notmatch '^\d+$') {
  throw "VERSION_CODE must be a positive integer. Current value: $currentVersionCode"
}

$nextVersionName = "{0}.{1}.{2}" -f $versionMajor, $versionMinor, ($versionPatch + 1)
$nextVersionCode = [int]$currentVersionCode + 1

$javaCandidates = @(
  $env:JAVA_HOME,
  'D:\software\android_studio\jbr',
  'C:\Program Files\Android\Android Studio\jbr',
  (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr')
) | Where-Object {
  $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe'))
}

$javaHome = $javaCandidates | Select-Object -First 1
if (-not $javaHome) {
  throw 'Java was not found. Install Android Studio or set JAVA_HOME.'
}

$env:JAVA_HOME = $javaHome
$env:WM_ANDROID_VERSION_NAME = $nextVersionName
$env:WM_ANDROID_VERSION_CODE = [string]$nextVersionCode

if (-not $env:ANDROID_HOME) {
  $sdkCandidate = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path -LiteralPath $sdkCandidate) {
    $env:ANDROID_HOME = $sdkCandidate
  }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  throw 'Android SDK was not found. Set ANDROID_HOME.'
}

Push-Location $projectRoot
try {
  & npm.cmd run build:android
  if ($LASTEXITCODE -ne 0) {
    throw "Android web build failed with exit code $LASTEXITCODE."
  }

  & $gradleWrapper -p $androidRoot --no-daemon assembleDebug
  if ($LASTEXITCODE -ne 0) {
    throw "APK build failed with exit code $LASTEXITCODE."
  }

  if (-not (Test-Path -LiteralPath $generatedApk)) {
    throw "APK was not generated at $generatedApk."
  }

  Copy-Item -LiteralPath $generatedApk -Destination $outputApk -Force
  $nextVersionContent = "VERSION_NAME=$nextVersionName`r`nVERSION_CODE=$nextVersionCode`r`n"
  Set-Content -LiteralPath $versionFile -Value $nextVersionContent -Encoding ascii -NoNewline
  $apk = Get-Item -LiteralPath $outputApk
  Write-Host "APK generated: $($apk.FullName) ($([math]::Round($apk.Length / 1MB, 2)) MB), version $nextVersionName ($nextVersionCode)"
} finally {
  Remove-Item Env:WM_ANDROID_VERSION_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:WM_ANDROID_VERSION_CODE -ErrorAction SilentlyContinue
  Pop-Location
}
