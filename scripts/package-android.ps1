$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$generatedApk = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$outputApk = Join-Path $projectRoot 'wm-personal-blog-debug.apk'

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
  $apk = Get-Item -LiteralPath $outputApk
  Write-Host "APK generated: $($apk.FullName) ($([math]::Round($apk.Length / 1MB, 2)) MB)"
} finally {
  Pop-Location
}
