param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Username = ("smoke_" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()),
  [string]$Password = "SmokeTest123456"
)

$ErrorActionPreference = "Stop"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Json {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [object]$Body = $null,
    [int[]]$AllowedStatus = @(200)
  )

  $uri = "$BaseUrl$Path"
  $params = @{
    Method = $Method
    Uri = $uri
    WebSession = $session
    SkipHttpErrorCheck = $true
  }

  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  $response = Invoke-WebRequest @params

  if ($AllowedStatus -notcontains [int]$response.StatusCode) {
    throw "Unexpected status $($response.StatusCode) for $Method $Path. Body: $($response.Content)"
  }

  if ([string]::IsNullOrWhiteSpace($response.Content)) {
    return $null
  }

  return $response.Content | ConvertFrom-Json
}

Write-Host "Checking health..."
Invoke-Json -Path "/api/health" | Out-Null

Write-Host "Registering test user $Username..."
Invoke-Json -Method "POST" -Path "/api/auth/register" -AllowedStatus @(201,409) -Body @{
  username = $Username
  displayName = "Smoke Test User"
  email = "$Username@pinfa.local"
  phone = $null
  password = $Password
  termsAccepted = $true
} | Out-Null

Write-Host "Logging in..."
Invoke-Json -Method "POST" -Path "/api/auth/login" -Body @{
  identifier = $Username
  password = $Password
} | Out-Null

Write-Host "Checking current user..."
Invoke-Json -Path "/api/users/me" | Out-Null

Write-Host "Checking feed..."
Invoke-Json -Path "/api/feed/home?limit=5" | Out-Null

Write-Host "Checking search..."
Invoke-Json -Path "/api/search?q=art&type=all&limit=5" -AllowedStatus @(200,400) | Out-Null

Write-Host "Checking notifications..."
Invoke-Json -Path "/api/notifications?limit=5" | Out-Null

Write-Host "Smoke test completed."
