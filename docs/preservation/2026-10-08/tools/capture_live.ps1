$ErrorActionPreference = 'Stop'
$archiveDirectory = Split-Path -Parent $PSScriptRoot
$snapshotDirectory = Join-Path $archiveDirectory 'snapshot'
$liveDirectory = Join-Path $archiveDirectory 'evidence\live'
New-Item -ItemType Directory -Path $liveDirectory -Force | Out-Null
$records = @()
foreach ($source in (Get-ChildItem -LiteralPath $snapshotDirectory -File -Filter '*.html')) {
    $uri = 'https://novasol.co.kr/' + $source.Name
    try {
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 25
        $content = [string]$response.Content
        $filename = $source.Name + '.txt'
        $destination = Join-Path $liveDirectory $filename
        [System.IO.File]::WriteAllText($destination, $content, [System.Text.UTF8Encoding]::new($false))
        $records += [PSCustomObject]@{
            page = $source.BaseName
            url = $uri
            status = [int]$response.StatusCode
            fetched_at_utc = [DateTime]::UtcNow.ToString('o')
            file = 'evidence/live/' + $filename
            sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            cloudflare_beacon = $content.Contains('static.cloudflareinsights.com')
            cloudflare_email_protection = $content.Contains('/cdn-cgi/l/email-protection')
        }
    } catch {
        $records += [PSCustomObject]@{page=$source.BaseName; url=$uri; status='unavailable'; error=$_.Exception.Message}
    }
}
$output = [PSCustomObject]@{date_kst='2026-10-08'; source='Direct HTTP GET; raw response saved as .html.txt without executing scripts'; pages=$records}
$output | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $archiveDirectory 'live-comparison.json') -Encoding utf8
Write-Output "Saved $($records.Count) production page observations."
