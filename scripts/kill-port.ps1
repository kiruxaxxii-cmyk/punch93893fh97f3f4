param([int]$Port = 3001)

$conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $conns) { exit 0 }

$procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $procIds) {
  if ($procId -and $procId -ne 0) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Milliseconds 500
