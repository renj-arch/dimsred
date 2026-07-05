param($filePath = "C:\Users\Renjith\Desktop\icode (2)\study\3d-globe.html")

$content = Get-Content -LiteralPath $filePath -Raw
$lines = $content -split "`r?`n"
$modifiedCount = 0
$totalFixes = 0
$dataKeys = @("desc", "fact", "sub", "detail")

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $origLine = $line
    $lineModified = $false
    
    if ($line -match "^\s*\{") {
        foreach ($key in $dataKeys) {
            $searchFrom = 0
            while ($searchFrom -lt $line.Length) {
                $pos = $line.IndexOf("$($key):'", $searchFrom)
                if ($pos -lt 0) { break }
                
                $startVal = $pos + $key.Length + 2  # position after the opening quote
                $iPos = $startVal
                
                while ($iPos -lt $line.Length) {
                    $c = $line[$iPos]
                    
                    if ($c -eq '\' -and $iPos + 1 -lt $line.Length -and $line[$iPos+1] -eq "'") {
                        # Already escaped quote - skip it
                        $iPos += 2
                        continue
                    }
                    
                    if ($c -eq "'") {
                        # Check if this is the closing quote
                        $rest = ""
                        if ($iPos + 1 -lt $line.Length) {
                            $rest = $line.Substring($iPos + 1)
                        }
                        
                        # A closing quote is followed by , or } or ] or end of line
                        # or by ,key: (like ,la: ,ln: ,sub: ,desc: ,fact: ,n: ,pts: ,steps:)
                        $isClosing = $false
                        if ($rest.Length -eq 0) {
                            $isClosing = $true
                        } elseif ($rest[0] -eq ',' -or $rest[0] -eq '}' -or $rest[0] -eq ']') {
                            $isClosing = $true
                        } elseif ($rest -match '^,\s*(la|ln|sub|desc|fact|detail|n|pts|steps|title|name)') {
                            $isClosing = $true
                        }
                        
                        if ($isClosing) {
                            # This is the closing quote - we're done with this value
                            break
                        } else {
                            # This is an unescaped apostrophe - escape it
                            $line = $line.Substring(0, $iPos) + "\" + $line.Substring($iPos)
                            $iPos += 2
                            $totalFixes++
                            $lineModified = $true
                        }
                    } else {
                        $iPos++
                    }
                }
                
                $searchFrom = $iPos + 1  # Continue after this value
            }
        }
        
        if ($lineModified) {
            $modifiedCount++
        }
    }
    
    $lines[$i] = $line
}

$result = $lines -join "`r`n"
Set-Content -LiteralPath $filePath -Value $result -NoNewline
Write-Host "Modified $modifiedCount lines, applied $totalFixes fixes"
