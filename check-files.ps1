$files = @("js/micro-test.js", "micro-test.html", "figures.html", "map.html", "scripts/ci-push.sh", "scripts/expand-course.js")
foreach ($f in $files) {
    if (Test-Path $f) {
        $size = (Get-Item $f).Length
        Write-Host "EXISTS: $f ($size bytes)"
    } else {
        Write-Host "MISSING: $f"
    }
}