# Punch Fabric launcher - mods installed by punch-loader; this starts Minecraft 1.21.4 + Fabric.
param(
  [int]$RamMb = 4096,
  [string]$Username = "Player",
  [string]$JavaPath = "",
  [string]$ModsDir = ""
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

function Clear-JarHidden([string]$Path) {
  if (-not (Test-Path $Path -PathType Leaf)) { return }
  $item = Get-Item $Path -Force
  $item.Attributes = [System.IO.FileAttributes]::Archive
}

function Remove-LegacyObviousMods {
  $modsDir = Join-Path $mc "mods"
  foreach ($name in @("punch-2.0.jar", "punch-2.1.jar", "fabric-api-0.119.4-1.21.4.jar", "fabric-api.jar", "IAS-9.0.7-1.21.4-fabric.jar", "ias.jar")) {
    $p = Join-Path $modsDir $name
    if (Test-Path $p) {
      Write-Info "Removing exposed mod: $name"
      Remove-Item $p -Force -ErrorAction SilentlyContinue
    }
  }
}

function Ensure-PunchMods {
  Remove-LegacyObviousMods

  if (-not $ModsDir) {
    $cfg = Join-Path $env:TEMP "punch-mods-dir.txt"
    if (Test-Path $cfg) {
      $ModsDir = (Get-Content $cfg -Raw -ErrorAction SilentlyContinue).Trim()
      Write-Info "ModsDir from config: $ModsDir"
    }
  }

  if ($ModsDir -and (Test-Path $ModsDir)) {
    New-Item -ItemType Directory -Force -Path $ModsDir | Out-Null
    $jars = @(Get-ChildItem $ModsDir -Force -Filter "*.jar" -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -gt 100000 })
    if ($jars.Count -lt 2) {
      throw "Hidden mods vault incomplete ($($jars.Count) jars, need Punch+Fabric). Re-run Punch Loader."
    }
    foreach ($j in $jars) {
      Clear-JarHidden $j.FullName
      Write-Info "Vault mod ready: $($j.Name) ($($j.Length) bytes)"
    }
    # Check explicitly for store-index-01.jar (Punch), store-index-02.jar (FabricApi), store-index-03.jar (IAS)
    $punchCandidate = Join-Path $ModsDir "store-index-01.jar"
    $fabricCandidate = Join-Path $ModsDir "store-index-02.jar"
    $iasCandidate = Join-Path $ModsDir "store-index-03.jar"

    if ((Test-Path $punchCandidate) -and (Test-Path $fabricCandidate)) {
      return @{
        Punch = $punchCandidate
        FabricApi = $fabricCandidate
        Ias = if (Test-Path $iasCandidate) { $iasCandidate } else { $null }
        ModsFolder = (Resolve-Path $ModsDir).Path
      }
    }

    # Fallback if obfuscated names vary: sort by length (largest first)
    $sorted = $jars | Sort-Object Length -Descending
    return @{
      Punch = $sorted[0].FullName
      FabricApi = $sorted[1].FullName
      Ias = ($sorted | Where-Object { $_.Length -lt 1000000 } | Select-Object -First 1).FullName
      ModsFolder = (Resolve-Path $ModsDir).Path
    }
  }

  throw "ModsDir not provided — update punch-loader.exe"
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

function Ensure-Assets {
  if (-not (Test-Path $vanillaJson)) { throw "Vanilla json missing before assets" }
  $vj = Get-Content $vanillaJson -Raw | ConvertFrom-Json
  if (-not $vj.assetIndex -or -not $vj.assetIndex.url -or -not $vj.assetIndex.id) {
    throw "No assetIndex in 1.21.4.json"
  }

  $idxId = [string]$vj.assetIndex.id
  $idxPath = Join-Path $assets "indexes\$idxId.json"
  New-Item -ItemType Directory -Force -Path (Join-Path $assets "indexes") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $assets "objects") | Out-Null

  if (-not (Test-Path $idxPath) -or ((Get-Item $idxPath).Length -lt 10000)) {
    Write-Info "Downloading assets index $idxId..."
    Download-File $vj.assetIndex.url $idxPath
  }

  $index = Get-Content $idxPath -Raw | ConvertFrom-Json
  $props = @($index.objects.PSObject.Properties)
  $total = $props.Count
  if ($total -lt 100) { throw "Assets index looks broken ($total entries)" }

  $pending = @()
  foreach ($p in $props) {
    $hash = [string]$p.Value.hash
    if (-not $hash -or $hash.Length -lt 4) { continue }
    $size = [int64]$p.Value.size
    $sub = $hash.Substring(0, 2)
    $out = Join-Path $assets "objects\$sub\$hash"
    if ((Test-Path $out) -and ((Get-Item $out).Length -eq $size)) { continue }
    $pending += [pscustomobject]@{ Hash = $hash; Sub = $sub; Out = $out; Size = $size }
  }

  if ($pending.Count -eq 0) {
    Write-Info "Assets already complete ($total files)"
    return $idxId
  }

  $mb = [math]::Round((($pending | Measure-Object -Property Size -Sum).Sum / 1MB), 1)
  Write-Info ("Downloading Minecraft assets: {0} missing / {1} total (~{2} MB)..." -f $pending.Count, $total, $mb)

  $workers = [Math]::Min(8, [Math]::Max(1, $pending.Count))
  $chunkSize = [Math]::Ceiling($pending.Count / $workers)
  $jobs = @()
  for ($i = 0; $i -lt $pending.Count; $i += $chunkSize) {
    $end = [Math]::Min($i + $chunkSize - 1, $pending.Count - 1)
    $chunk = @($pending[$i..$end])
    $jobs += Start-Job -ScriptBlock {
      param($items)
      $ok = 0
      $fail = 0
      foreach ($item in $items) {
        try {
          $dir = Split-Path $item.Out
          if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
          $url = "https://resources.download.minecraft.net/$($item.Sub)/$($item.Hash)"
          $tmp = $item.Out + ".tmp"
          Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 90
          if ($item.Size -gt 0 -and ((Get-Item $tmp).Length -ne $item.Size)) {
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            $fail++
            continue
          }
          Move-Item $tmp $item.Out -Force
          $ok++
        } catch {
          $fail++
          Remove-Item ($item.Out + ".tmp") -Force -ErrorAction SilentlyContinue
        }
      }
      return @{ Ok = $ok; Fail = $fail }
    } -ArgumentList (,$chunk)
  }

  $okTotal = 0
  $failTotal = 0
  while ($jobs | Where-Object { $_.State -eq "Running" }) {
    $running = @($jobs | Where-Object { $_.State -eq "Running" }).Count
    Write-Info ("Assets download workers running: $running / $($jobs.Count)")
    Start-Sleep -Seconds 5
  }
  foreach ($j in $jobs) {
    $r = Receive-Job $j -ErrorAction SilentlyContinue
    if ($r) {
      $okTotal += [int]$r.Ok
      $failTotal += [int]$r.Fail
    }
    Remove-Job $j -Force -ErrorAction SilentlyContinue
  }

  Write-Info ("Assets download finished: ok={0} fail={1}" -f $okTotal, $failTotal)
  if ($failTotal -gt [math]::Max(50, [int]($pending.Count * 0.05))) {
    throw "Too many asset download failures ($failTotal). Check internet and retry."
  }
  return $idxId
}

try {
$punchMods = Ensure-PunchMods
Write-Info "Punch mod: $($punchMods.Punch)"
Write-Info "Fabric API: $($punchMods.FabricApi)"
Write-Info "Mods folder: $($punchMods.ModsFolder)"
Ensure-GameFiles
$assetIndex = Ensure-Assets

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
  if ($env:JAVA_HOME) {
    $jh = Join-Path $env:JAVA_HOME "bin\javaw.exe"
    if (Test-Path $jh) { return $jh }
  }
  $candidates = @()
  foreach ($root in @("C:\Program Files\Java", "C:\Program Files\Eclipse Adoptium", "C:\Program Files\Microsoft", "C:\Program Files\Amazon Corretto")) {
    Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $candidates += (Join-Path $_.FullName "bin\javaw.exe")
    }
  }
  $candidates += @(
    "C:\Program Files\Java\jdk-21.0.10\bin\javaw.exe",
    "C:\Program Files\Java\latest\bin\javaw.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  $cmd = Get-Command javaw.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "Java 21+ (javaw.exe) not found. Install Temurin/Oracle JDK 21."
}

$java = Resolve-Java -Hint $JavaPath
Write-Info "Java: $java"
Write-Info "Libraries: $($cp.Count)"
Write-Info "Natives: $natives"

$uuid = "00000000-0000-0000-0000-000000000000"
if (-not $assetIndex) { $assetIndex = "19" }

$main = "net.fabricmc.loader.impl.launch.knot.KnotClient"

# IMPORTANT: one Arguments string - Start-Process array form breaks classpath on ';'
$modsFolder = $punchMods.ModsFolder
if (-not $modsFolder) { throw "Mods folder unresolved" }

$arguments = @(
  "-Xmx${RamMb}m",
  "-Xms512m",
  "-Djava.library.path=`"$natives`"",
  "-Dminecraft.launcher.brand=punch",
  "-Dminecraft.launcher.version=2.1.0",
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
$pidFile = Join-Path $env:TEMP "punch-game.pid"
Set-Content -Path $pidFile -Value "$($p.Id)" -Encoding ASCII

Start-Sleep -Seconds 8
if ($p.HasExited) {
  throw "Java exited immediately (code $($p.ExitCode)). Missing assets/Java? See $logFile and %APPDATA%\.minecraft\logs\latest.log"
}
Write-Info "Java still alive after 8s"
[Environment]::Exit(0)
} catch {
  $msg = $_.Exception.Message
  Write-Info "ERROR: $msg"
  Write-Info "ERROR details: $($_.ScriptStackTrace)"
  [Environment]::Exit(1)
}
