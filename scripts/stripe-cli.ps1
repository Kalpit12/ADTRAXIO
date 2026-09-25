# Stripe CLI wrapper (works before PATH refresh after winget install)
$stripe = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe"
if (-not (Test-Path $stripe)) {
  Write-Error "Stripe CLI not found. Install: winget install Stripe.StripeCli"
  exit 1
}
& $stripe @args
