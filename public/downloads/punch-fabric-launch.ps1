# Punch Fabric launcher - mods installed by punch-loader; this starts Minecraft 1.21.4 + Fabric.
param(
  [int]$RamMb = 4096,
  [string]$Username = "Player",
  [string]$JavaPath = ""
)

$ErrorActionPreference = "Stop"
$mc = Join-Path $env:APPDATA ".minecraft"
$fabricId = "fabric-loader-0.19.3-1.21.4"
$vanillaId = "1.21.4"
$fabricJson = Join-Path $mc "versions\$fabricId\$fabricId.json"
$vanillaJson = Join-Path $mc "versions\$vanillaId\$vanillaId.json"
$vanillaJar = Join-Path $mc "versions\$vanillaId\$vanillaId.jar"
$libsRoot = Join-Path $mc "libraries"
$assets = Join-Path $mc "assets"
$natives = Join-Path $mc "versions\$fabricId\natives"
$logFile = Join-Path $env:TEMP "punch-fabric-launch.log"

function Write-Info($m) {
  $line = "[punch] $m"
  Write-Host $line
  Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Remove-Item $logFile -ErrorAction SilentlyContinue
Write-Info "start $(Get-Date -Format o)"

function Download-File([string]$Url, [string]$OutFile) {
  New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
  $tmp = $OutFile + ".tmp"
  Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing -UserAgent "PunchLauncher/2.0"
  if (-not (Test-Path $tmp) -or ((Get-Item $tmp).Length -lt 64)) {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    throw "Download failed: $Url"
  }
  Move-Item $tmp $OutFile -Force
}

function Ensure-PunchMods {
  $modsDir = Join-Path $mc "mods"
  $disabledDir = Join-Path $mc "mods-disabled-by-punch"
  New-Item -ItemType Directory -Force -Path $modsDir | Out-Null
  New-Item -ItemType Directory -Force -Path $disabledDir | Out-Null

  # Fabric Loader skips Windows Hidden jars - clear H/S from punch + fabric-api.
  Get-ChildItem $modsDir -Force -Filter "*.jar" -ErrorAction SilentlyContinue | ForEach-Object {
    $n = $_.Name.ToLowerInvariant()
    $keep = ($n -eq "punch-2.0.jar") -or ($n -like "fabric-api*.jar")
    if ($keep) {
      $_.Attributes = [System.IO.FileAttributes]::Archive
      Write-Info "Mod ready (unhidden): $($_.Name) ($($_.Length) bytes)"
    } else {
      Write-Info "Disabling conflicting mod: $($_.Name)"
      $dest = Join-Path $disabledDir $_.Name
      if (Test-Path $dest) { Remove-Item $dest -Force -ErrorAction SilentlyContinue }
      $_.Attributes = [System.IO.FileAttributes]::Archive
      Move-Item $_.FullName $dest -Force
    }
  }

  $punch = Join-Path $modsDir "punch-2.0.jar"
  $apiNamed = Join-Path $modsDir "fabric-api-0.119.4-1.21.4.jar"
  $apiAlt = Join-Path $modsDir "fabric-api.jar"

  if (-not (Test-Path $punch) -or ((Get-Item $punch -Force).Length -lt 1000000)) {
    Write-Info "Downloading punch-2.0.jar into mods..."
    $urls = @(
      "https://punchdlc.up.railway.app/downloads/punch-client.jar",
      "https://raw.githubusercontent.com/kiruxaxxii-cmyk/punch93893fh97f3f4/main/public/downloads/punch-client.jar",
      "https://www.dropbox.com/scl/fi/jd9hjzfswg24zgpd79g6k/punch-2.0.jar?rlkey=6gsifmvn9itrg3t8hezynsyeg&dl=1"
    )
    $ok = $false
    foreach ($u in $urls) {
      try { Download-File $u $punch; $ok = $true; break } catch { Write-Info "punch dl fail: $($_.Exception.Message)" }
    }
    if (-not $ok) { throw "Cannot download punch-2.0.jar - check internet" }
    (Get-Item $punch).Attributes = [System.IO.FileAttributes]::Archive
  }

  $api = Get-ChildItem $modsDir -Force -Filter "fabric-api*.jar" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 100000 } | Select-Object -First 1
  if (-not $api) {
    Write-Info "Downloading fabric-api into mods..."
    $urls = @(
      "https://punchdlc.up.railway.app/downloads/fabric-api-0.119.4-1.21.4.jar",
      "https://raw.githubusercontent.com/kiruxaxxii-cmyk/punch93893fh97f3f4/main/public/downloads/fabric-api-0.119.4-1.21.4.jar",
      "https://www.dropbox.com/scl/fi/zg3vdz6ho6vq4joz1eakc/fabric-api-0.119.4-1.21.4.jar?rlkey=bvwgby3hjwe6e9h08yflb3ycy&dl=1"
    )
    $ok = $false
    foreach ($u in $urls) {
      try { Download-File $u $apiNamed; $ok = $true; break } catch { Write-Info "api dl fail: $($_.Exception.Message)" }
    }
    if (-not $ok) { throw "Cannot download fabric-api - check internet" }
    Copy-Item $apiNamed $apiAlt -Force
    (Get-Item $apiNamed).Attributes = [System.IO.FileAttributes]::Archive
    (Get-Item $apiAlt).Attributes = [System.IO.FileAttributes]::Archive
    $api = Get-Item $apiNamed
  }

  return @{
    Punch = (Get-Item $punch -Force).FullName
    FabricApi = $api.FullName
  }
}

function Ensure-GameFiles {
  if (-not (Test-Path $vanillaJson)) {
    Write-Info "Downloading 1.21.4.json..."
    $manifest = Invoke-RestMethod "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
    $ver = $manifest.versions | Where-Object { $_.id -eq "1.21.4" } | Select-Object -First 1
    if (-not $ver) { throw "1.21.4 not found in Mojang manifest" }
    Download-File $ver.url $vanillaJson
  }

  if (-not (Test-Path $vanillaJar) -or ((Get-Item $vanillaJar).Length -lt 1000000)) {
    Write-Info "Downloading 1.21.4.jar..."
    $vj = Get-Content $vanillaJson -Raw | ConvertFrom-Json
    if (-not $vj.downloads.client.url) { throw "No client download URL in 1.21.4.json" }
    Download-File $vj.downloads.client.url $vanillaJar
  }

  if (-not (Test-Path $fabricJson)) {
    Write-Info "Installing Fabric loader profile $fabricId..."
    $fabricUrl = "https://meta.fabricmc.net/v2/versions/loader/1.21.4/0.19.3/profile/json"
    Download-File $fabricUrl $fabricJson
  }
}

try {
$punchMods = Ensure-PunchMods
Write-Info "Punch mod: $($punchMods.Punch)"
Write-Info "Fabric API: $($punchMods.FabricApi)"
Ensure-GameFiles


function Get-LibPath([string]$name) {
  $parts = $name.Split(":")
  if ($parts.Count -lt 3) { return $null }
  $group = $parts[0].Replace(".", "/")
  $artifact = $parts[1]
  $ver = $parts[2]
  $classifier = if ($parts.Count -ge 4) { $parts[3] } else { $null }
  $file = if ($classifier) { "$artifact-$ver-$classifier.jar" } else { "$artifact-$ver.jar" }
  return Join-Path $libsRoot "$group\$artifact\$ver\$file"
}

function Test-OsRules($lib) {
  if (-not $lib.rules) { return $true }
  $allow = $false
  $sawAllow = $false
  foreach ($r in $lib.rules) {
    $osOk = $true
    if ($r.os -and $r.os.name) {
      $osOk = ($r.os.name -eq "windows")
    }
    if ($r.action -eq "allow") {
      $sawAllow = $true
      if ($osOk) { $allow = $true }
    } elseif ($r.action -eq "disallow") {
      if ($osOk) { return $false }
    }
  }
  if ($sawAllow) { return $allow }
  return $true
}

function Ensure-LibraryFile($lib) {
  if (-not $lib.name -or -not $lib.downloads -or -not $lib.downloads.artifact) { return $null }
  $art = $lib.downloads.artifact
  $p = Join-Path $libsRoot ($art.path -replace "/", "\")
  $need = $true
  if (Test-Path $p) {
    $len = (Get-Item $p).Length
    if ($art.size -and $len -eq [int64]$art.size) { $need = $false }
    elseif (-not $art.size -and $len -gt 1024) { $need = $false }
  }
  if ($need) {
    if (-not $art.url) { return $null }
    Write-Info "Fixing library $($lib.name)..."
    New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null
    Invoke-WebRequest -Uri $art.url -OutFile ($p + ".tmp") -UseBasicParsing
    Move-Item ($p + ".tmp") $p -Force
  }
  return $p
}

function Collect-Classpath($jsonPath) {
  $j = Get-Content $jsonPath -Raw | ConvertFrom-Json
  $paths = @()
  foreach ($lib in $j.libraries) {
    if (-not $lib.name) { continue }
    if (-not (Test-OsRules $lib)) { continue }
    if ($lib.name -match "natives-") { continue }
    if ($lib.natives) { continue }

    $p = $null
    if ($lib.downloads -and $lib.downloads.artifact) {
      try { $p = Ensure-LibraryFile $lib } catch { Write-Info "lib fix failed: $($lib.name)" }
    }
    if (-not $p) { $p = Get-LibPath $lib.name }

    # Fabric maven libs without downloads.artifact - download from url base if missing
    if ($p -and -not (Test-Path $p) -and $lib.url) {
      $rel = ($p.Substring($libsRoot.Length).TrimStart("\")).Replace("\", "/")
      $url = $lib.url.TrimEnd("/") + "/" + $rel
      Write-Info "Downloading $($lib.name) from fabric maven..."
      New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null
      try {
        Invoke-WebRequest -Uri $url -OutFile $p -UseBasicParsing
      } catch {
        Write-Info "download failed: $url"
      }
    }

    if ($p -and (Test-Path $p)) { $paths += $p }
  }
  return $paths
}

function Ensure-Natives($jsonPath, $outDir) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $marker = Join-Path $outDir ".punch-natives-ok"
  if ((Test-Path $marker) -and ((Get-ChildItem $outDir -File -Filter "*.dll" -ErrorAction SilentlyContinue).Count -gt 5)) {
    Write-Info "Natives already extracted"
    return
  }

  Write-Info "Extracting natives -> $outDir"
  $j = Get-Content $jsonPath -Raw | ConvertFrom-Json
  $count = 0
  foreach ($lib in $j.libraries) {
    if (-not $lib.name) { continue }
    if (-not (Test-OsRules $lib)) { continue }
    if ($lib.name -notmatch "natives-windows($|:)") { continue }
    if ($lib.name -match "natives-windows-arm64|natives-windows-x86") { continue }

    $jar = Get-LibPath $lib.name
    if (-not $jar) { continue }

    if (-not (Test-Path $jar)) {
      $url = $null
      if ($lib.downloads -and $lib.downloads.artifact -and $lib.downloads.artifact.url) {
        $url = $lib.downloads.artifact.url
      }
      if (-not $url) {
        Write-Info "Missing native jar (no url): $($lib.name)"
        continue
      }
      Write-Info "Downloading $($lib.name)..."
      New-Item -ItemType Directory -Force -Path (Split-Path $jar) | Out-Null
      try {
        Invoke-WebRequest -Uri $url -OutFile $jar -UseBasicParsing
      } catch {
        Write-Info "Download failed: $($lib.name)"
        continue
      }
    }

    $tmp = Join-Path $env:TEMP ("punch-nat-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    Copy-Item $jar (Join-Path $tmp "n.jar")
    try {
      Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
      [System.IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $tmp "n.jar"), $tmp)
    } catch {
      Push-Location $tmp
      & jar xf n.jar 2>$null
      Pop-Location
    }
    Get-ChildItem $tmp -Recurse -Include *.dll,*.so,*.dylib -ErrorAction SilentlyContinue | ForEach-Object {
      Copy-Item $_.FullName (Join-Path $outDir $_.Name) -Force
      $count++
    }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
  Write-Info "Native files extracted: $count"
  if ($count -lt 3) { throw "Failed to extract natives (got $count dll). Check internet and retry." }
  Set-Content -Path $marker -Value (Get-Date -Format o)
}

$cp = New-Object System.Collections.Generic.List[string]
# Fabric libs first (ASM 9.10.1 etc.), then vanilla - skip vanilla org.ow2.asm* to avoid duplicates
foreach ($p in (Collect-Classpath $fabricJson)) { [void]$cp.Add($p) }
foreach ($p in (Collect-Classpath $vanillaJson)) {
  if ($p -match '[\\/]org[\\/]ow2[\\/]asm[\\/]') { continue }
  [void]$cp.Add($p)
}
[void]$cp.Add($vanillaJar)
$cp = $cp | Select-Object -Unique
$classpath = ($cp -join ";")

if ($cp.Count -lt 20) {
  throw "Too few libraries ($($cp.Count)). Launch Fabric 1.21.4 once in your Minecraft launcher to download libs."
}

Ensure-Natives -jsonPath $vanillaJson -outDir $natives

function Resolve-Java {
  param([string]$Hint)
  if ($Hint -and (Test-Path $Hint)) { return $Hint }
  $candidates = @()
  Get-ChildItem "C:\Program Files\Java" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $candidates += (Join-Path $_.FullName "bin\javaw.exe")
  }
  Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "21" } | ForEach-Object {
    $candidates += (Join-Path $_.FullName "bin\javaw.exe")
  }
  $candidates += @(
    "C:\Program Files\Java\jdk-21.0.10\bin\javaw.exe",
    "C:\Program Files\Java\latest\bin\javaw.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  $cmd = Get-Command javaw.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "Java 21+ not found"
}

$java = Resolve-Java -Hint $JavaPath
Write-Info "Java: $java"
Write-Info "Libraries: $($cp.Count)"
Write-Info "Natives: $natives"

$uuid = "00000000-0000-0000-0000-000000000000"
$assetIndex = "19"
try {
  $vj = Get-Content $vanillaJson -Raw | ConvertFrom-Json
  if ($vj.assetIndex.id) { $assetIndex = $vj.assetIndex.id }
} catch {}

$main = "net.fabricmc.loader.impl.launch.knot.KnotClient"

# IMPORTANT: one Arguments string - Start-Process array form breaks classpath on ';'
$modsFolder = Join-Path $mc "mods"

$arguments = @(
  "-Xmx${RamMb}m",
  "-Xms512m",
  "-Djava.library.path=`"$natives`"",
  "-Dminecraft.launcher.brand=punch",
  "-Dminecraft.launcher.version=2.0.11",
  "-Dfabric.modsFolder=`"$modsFolder`"",
  "-DFabricMcEmu=`" net.minecraft.client.main.Main `"",
  "-cp",
  "`"$classpath`"",
  $main,
  "--username", $Username,
  "--version", $fabricId,
  "--gameDir", "`"$mc`"",
  "--assetsDir", "`"$assets`"",
  "--assetIndex", $assetIndex,
  "--uuid", $uuid,
  "--accessToken", "0",
  "--userType", "legacy",
  "--versionType", "release"
) -join " "

Write-Info "Starting Fabric $fabricId..."
Write-Info ("Classpath jars: " + $cp.Count)

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $java
$psi.Arguments = $arguments
$psi.WorkingDirectory = $mc
$psi.UseShellExecute = $false
$p = [System.Diagnostics.Process]::Start($psi)
if (-not $p) { throw "Failed to start Java process" }
Write-Info "PID $($p.Id)"

Start-Sleep -Seconds 4
if ($p.HasExited) {
  throw "Java exited immediately (code $($p.ExitCode)). See $logFile and .minecraft/logs"
}
Write-Info "Java still alive after 4s"
exit 0
} catch {
  $msg = $_.Exception.Message
  Write-Info "ERROR: $msg"
  Write-Info "ERROR details: $($_.ScriptStackTrace)"
  throw
}
