param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [int]$Port = 3000,
  [switch]$SkipServerStart,
  [switch]$AllowRemote
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BaseUrl = $BaseUrl.TrimEnd("/")
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$failures = New-Object System.Collections.Generic.List[string]
$startedProcess = $null
$startedServer = $false

function Assert-LocalBaseUrl {
  if ($AllowRemote) {
    return
  }

  $uri = [Uri]$BaseUrl
  $allowedHosts = @("localhost", "127.0.0.1", "::1")

  if ($allowedHosts -notcontains $uri.Host) {
    throw "Refusing to run smoke tests against non-local host '$($uri.Host)'. Pass -AllowRemote only for an intentional non-production test target."
  }
}

function Invoke-SmokeRequest {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [object]$Body = $null
  )

  $params = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
    WebSession = $session
    UseBasicParsing = $true
    ErrorAction = "Stop"
  }

  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  try {
    $response = Invoke-WebRequest @params

    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Content = $response.Content
      Headers = $response.Headers
    }
  } catch {
    $statusCode = 0
    $content = $_.Exception.Message
    $response = $_.Exception.Response

    if ($null -ne $response) {
      try {
        $statusCode = [int]$response.StatusCode
      } catch {
        $statusCode = 0
      }

      try {
        $stream = $response.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
          $content = $_.ErrorDetails.Message
        }
      }
    } elseif ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $content = $_.ErrorDetails.Message
    }

    return [pscustomobject]@{
      StatusCode = $statusCode
      Content = $content
      Headers = @{}
    }
  }
}

function ConvertFrom-JsonSafe {
  param([string]$Content)

  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }

  return $Content | ConvertFrom-Json
}

function Assert-Status {
  param(
    [object]$Response,
    [int[]]$AllowedStatus,
    [string]$StepName
  )

  if ($AllowedStatus -notcontains [int]$Response.StatusCode) {
    throw "$StepName returned HTTP $($Response.StatusCode). Body: $($Response.Content)"
  }
}

function Add-Pass {
  param(
    [string]$Name,
    [string]$Details = ""
  )

  if ($Details) {
    Write-Host "PASS $Name - $Details" -ForegroundColor Green
  } else {
    Write-Host "PASS $Name" -ForegroundColor Green
  }
}

function Add-Fail {
  param(
    [string]$Name,
    [string]$Details
  )

  $failures.Add("$Name`: $Details") | Out-Null
  Write-Host "FAIL $Name - $Details" -ForegroundColor Red
}

function Test-Step {
  param(
    [string]$Name,
    [scriptblock]$Check
  )

  try {
    & $Check
    Add-Pass $Name
  } catch {
    Add-Fail $Name $_.Exception.Message
  }
}

function Wait-ForHealth {
  param([int]$TimeoutSeconds = 60)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $response = Invoke-SmokeRequest -Path "/api/health"

    if ($response.StatusCode -eq 200) {
      return $true
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Ensure-DevServer {
  $health = Invoke-SmokeRequest -Path "/api/health"

  if ($health.StatusCode -eq 200) {
    return
  }

  if ($SkipServerStart) {
    throw "Health check failed at $BaseUrl/api/health and -SkipServerStart was set."
  }

  $stdoutPath = Join-Path $PSScriptRoot "smoke-dev.out.log"
  $stderrPath = Join-Path $PSScriptRoot "smoke-dev.err.log"

  Write-Host "Starting local dev server on 127.0.0.1:$Port..."
  $script:startedProcess = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev -- --hostname 127.0.0.1 --port $Port" `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru
  $script:startedServer = $true

  if (-not (Wait-ForHealth -TimeoutSeconds 90)) {
    throw "Dev server did not become healthy within 90 seconds. See $stdoutPath and $stderrPath."
  }
}

function Stop-StartedServer {
  if ($startedServer -and $null -ne $startedProcess -and -not $startedProcess.HasExited) {
    Write-Host "Stopping smoke-test dev server..."
    & taskkill.exe /PID $startedProcess.Id /T /F | Out-Null
  }
}

Assert-LocalBaseUrl

try {
  Ensure-DevServer

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $username = "smoke_$stamp"
  $email = "$username@pinfa.local"
  $password = "SmokeTest123456"

  Test-Step "Health endpoint" {
    $response = Invoke-SmokeRequest -Path "/api/health"
    Assert-Status $response @(200) "Health endpoint"
    $json = ConvertFrom-JsonSafe $response.Content
    if (-not $json.ok) {
      throw "Health response did not include ok=true."
    }
  }

  Test-Step "Public page renders" {
    foreach ($path in @("/", "/auth/register", "/auth/login", "/search")) {
      $response = Invoke-SmokeRequest -Path $path
      Assert-Status $response @(200) "GET $path"
    }
  }

  Test-Step "Register user" {
    $response = Invoke-SmokeRequest -Method "POST" -Path "/api/auth/register" -Body @{
      username = $username
      displayName = "Smoke Test User"
      email = $email
      phone = $null
      password = $password
      termsAccepted = $true
    }
    Assert-Status $response @(201) "Register user"
    $json = ConvertFrom-JsonSafe $response.Content
    if (-not $json.user -or $json.user.username -ne $username) {
      throw "Register response did not include the expected user."
    }
    if ($json.user.PSObject.Properties.Name -contains "passwordHash") {
      throw "Register response exposed passwordHash."
    }
  }

  Test-Step "Login user" {
    $response = Invoke-SmokeRequest -Method "POST" -Path "/api/auth/login" -Body @{
      identifier = $email
      password = $password
    }
    Assert-Status $response @(200) "Login user"
    $json = ConvertFrom-JsonSafe $response.Content
    if (-not $json.user -or $json.user.username -ne $username) {
      throw "Login response did not include the expected user."
    }
    if ($json.user.PSObject.Properties.Name -contains "passwordHash") {
      throw "Login response exposed passwordHash."
    }
  }

  Test-Step "Current user is authenticated" {
    $response = Invoke-SmokeRequest -Path "/api/users/me"
    Assert-Status $response @(200) "GET /api/users/me"
    $json = ConvertFrom-JsonSafe $response.Content
    if (-not $json.user -or $json.user.username -ne $username) {
      throw "Current user response did not include the logged-in user."
    }
    if ($json.user.PSObject.Properties.Name -contains "passwordHash") {
      throw "Current user response exposed passwordHash."
    }
  }

  Test-Step "Authenticated pages render" {
    foreach ($path in @("/profile", "/onboarding/interests", "/upload", "/notifications")) {
      $response = Invoke-SmokeRequest -Path $path
      Assert-Status $response @(200) "GET $path"
    }
  }

  Test-Step "Feed endpoint" {
    $response = Invoke-SmokeRequest -Path "/api/feed/home?limit=5"
    Assert-Status $response @(200) "GET /api/feed/home"
    $json = ConvertFrom-JsonSafe $response.Content
    if ($json.PSObject.Properties.Name -notcontains "items") {
      throw "Feed response did not include items."
    }
  }

  Test-Step "Search endpoint" {
    $response = Invoke-SmokeRequest -Path "/api/search?q=art&type=all&limit=5"
    Assert-Status $response @(200) "GET /api/search"
    $json = ConvertFrom-JsonSafe $response.Content
    if ($json.query -ne "art") {
      throw "Search response did not echo the normalized query."
    }
  }

  Test-Step "Notifications endpoint with auth" {
    $response = Invoke-SmokeRequest -Path "/api/notifications?limit=5"
    Assert-Status $response @(200) "GET /api/notifications"
    $json = ConvertFrom-JsonSafe $response.Content
    if ($json.PSObject.Properties.Name -notcontains "items") {
      throw "Notifications response did not include items."
    }
  }

  Test-Step "Logout user" {
    $response = Invoke-SmokeRequest -Method "POST" -Path "/api/auth/logout"
    Assert-Status $response @(200) "POST /api/auth/logout"
    $json = ConvertFrom-JsonSafe $response.Content
    if (-not $json.ok) {
      throw "Logout response did not include ok=true."
    }
  }

  Test-Step "Current user is blocked after logout" {
    $response = Invoke-SmokeRequest -Path "/api/users/me"
    Assert-Status $response @(401) "GET /api/users/me after logout"
  }

  Write-Host ""
  if ($failures.Count -gt 0) {
    Write-Host "Smoke test completed with $($failures.Count) failure(s)." -ForegroundColor Red
    foreach ($failure in $failures) {
      Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
  }

  Write-Host "Smoke test completed successfully." -ForegroundColor Green
  exit 0
} finally {
  Stop-StartedServer
}
