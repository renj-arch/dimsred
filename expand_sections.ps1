param()

$ErrorActionPreference = 'Stop'
$filePath = "C:\Users\Renjith\Desktop\icode (2)\study\upsc\course\gs\lesson-indian-history.html"
Write-Host "Reading $filePath ..."
$content = Get-Content -LiteralPath $filePath -Encoding UTF8 -Raw

# Find boundaries
$section1Marker = '<!-- ===================== SECTION 1: PREHISTORIC INDIA ===================== -->'
$practiceMarker = '<!-- ===================== PRACTICE QUESTIONS ===================== -->'
$section1Idx = $content.IndexOf($section1Marker)
$practiceIdx = $content.IndexOf($practiceMarker)

if ($section1Idx -eq -1) { throw "Section 1 marker not found" }
if ($practiceIdx -eq -1) { throw "Practice marker not found" }

Write-Host "Section 1 starts at index $section1Idx, Practice at index $practiceIdx"

$prefix = $content.Substring(0, $section1Idx)
$suffix = $content.Substring($practiceIdx)

Write-Host "Prefix length: $($prefix.Length) chars, Suffix length: $($suffix.Length) chars"

# Build all expanded sections
$sb = New-Object System.Text.StringBuilder
