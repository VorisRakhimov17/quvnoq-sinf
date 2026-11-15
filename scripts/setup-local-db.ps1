$ErrorActionPreference = "Stop"
# Lokal PostgreSQL'da "quvnoq" foydalanuvchisi va "quvnoq_sinf" bazasini yaratadi.
# postgres parolini bilmasdan ishlaydi: pg_hba.conf vaqtincha o'zgartiriladi va keyin qaytariladi.
# Administrator sifatida ishga tushiring.
$log = Join-Path $PSScriptRoot "setup-db.log"
function Log($m) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format HH:mm:ss), $m) }
Set-Content -Path $log -Value "start"

$hba    = "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
$backup = "$hba.quvnoq-backup"
$psql   = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$svc    = "postgresql-x64-17"
$envFile = Join-Path $PSScriptRoot "..\backend\.env"

$chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$pw = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

Copy-Item $hba $backup -Force
Log "backup ok"
try {
  $orig = [IO.File]::ReadAllText($hba)
  $temp = "host all postgres 127.0.0.1/32 trust`r`nhost all postgres ::1/128 trust`r`n" + $orig
  [IO.File]::WriteAllText($hba, $temp)
  Restart-Service $svc -Force
  Log "trust mode on, service restarted"

  $env:PGCONNECT_TIMEOUT = "5"
  $env:PGCLIENTENCODING = "UTF8"
  # psql xatolari skriptni to'xtatmasin, natijasini o'zimiz tekshiramiz
  $ErrorActionPreference = "Continue"

  # So'rov natijasini (yoki xato matnini) qaytaradi
  function Q($sql) {
    $out = & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -tAc $sql 2>&1 | ForEach-Object { "$_" }
    return @{ code = $LASTEXITCODE; text = (($out -join " ").Trim()) }
  }
  # Parol bor buyruqlar: chiqishi logga yozilmaydi
  function Exec($sql) {
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -qc $sql 2>&1 | Out-Null
    return $LASTEXITCODE
  }

  $r = $null
  for ($i = 1; $i -le 15; $i++) {
    $r = Q "SELECT 1"
    if ($r.code -eq 0) { break }
    Start-Sleep -Seconds 2
  }
  if ($r.code -ne 0) { throw ("ulanib bo'lmadi: " + $r.text) }
  Log "connected"

  $role = Q "SELECT count(*) FROM pg_roles WHERE rolname='quvnoq'"
  if ($role.code -ne 0) { throw ("role check: " + $role.text) }
  if ($role.text -eq "1") {
    if ((Exec "ALTER ROLE quvnoq WITH LOGIN CREATEDB PASSWORD '$pw';") -ne 0) { throw "ALTER ROLE failed" }
    Log "role existed, password reset"
  } else {
    if ((Exec "CREATE ROLE quvnoq WITH LOGIN CREATEDB PASSWORD '$pw';") -ne 0) { throw "CREATE ROLE failed" }
    Log "role created"
  }

  $db = Q "SELECT count(*) FROM pg_database WHERE datname='quvnoq_sinf'"
  if ($db.code -ne 0) { throw ("db check: " + $db.text) }
  if ($db.text -ne "1") {
    $c = Q "CREATE DATABASE quvnoq_sinf OWNER quvnoq ENCODING 'UTF8' TEMPLATE template0"
    if ($c.code -ne 0) { throw ("db create: " + $c.text) }
    Log "database created"
  } else { Log "database existed" }
  $ErrorActionPreference = "Stop"

  $envText = [IO.File]::ReadAllText($envFile)
  $envText = $envText -replace 'postgresql://[^@"]*@localhost:5432/quvnoq_sinf', "postgresql://quvnoq:$pw@localhost:5432/quvnoq_sinf"
  [IO.File]::WriteAllText($envFile, $envText)
  Log ".env updated"
}
catch { Log ("ERROR: " + $_.Exception.Message) }
finally {
  Copy-Item $backup $hba -Force
  Remove-Item $backup -Force
  Restart-Service $svc -Force
  Start-Sleep -Seconds 2
  Log ("restored original pg_hba.conf, service: " + (Get-Service $svc).Status)
  Log "done"
}
