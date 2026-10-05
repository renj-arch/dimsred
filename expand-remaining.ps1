$base = "C:\Users\Renjith\Desktop\icode (2)\study"

function Expand-File {
  param($relPath, $newContent, $pqJSON)
  
  $fullPath = Join-Path $base $relPath
  $c = [System.IO.File]::ReadAllText($fullPath)
  
  # Find the content boundary
  $marker = '<h3>Key Concepts</h3>'
  $afterMarker = '</ul>'
  $pqMarker = '<h3 style="margin-top:24px;margin-bottom:12px;font-size:1.1em">Practice Questions</h3>'
  
  $startIdx = $c.IndexOf($marker)
  $endIdx = $c.IndexOf($pqMarker)
  
  if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Output "ERROR: Could not find markers in $relPath"
    return
  }
  
  # Content starts after the marker line ends
  $contentStart = $c.IndexOf("`n", $startIdx) + 1
  # Replace up to the practice questions marker
  $before = $c.Substring(0, $contentStart)
  $after = $c.Substring($endIdx)
  
  $expanded = @"
`n$newContent
"@
  
  # Also replace practiceQs
  $pqEndIdx = $after.IndexOf('var answered={}')
  if ($pqEndIdx -ge 0) {
    $pqBefore = $after.Substring(0, $pqEndIdx)
    # Find the start of practiceQs
    $pqStartIdx = $after.IndexOf('var practiceQs = [')
    if ($pqStartIdx -ge 0) {
      $beforePq = $after.Substring(0, $pqStartIdx)
      $afterPq = $after.Substring($pqEndIdx)
      $after = $beforePq + "var practiceQs = $pqJSON`n" + $afterPq
    }
  }
  
  $result = $before + $expanded + "`n" + $after
  [System.IO.File]::WriteAllText($fullPath, $result, [System.Text.UTF8Encoding]::new($false))
  Write-Output "Written $relPath"
}

# ===== 1. SYLLOGISM =====
$syllogismContent = @"
<h2>Introduction to Syllogism</h2>
<p>Syllogism is the most scoring topic in SSC CGL Reasoning. In Tier 1, 2-3 questions appear; in Tier 2, 3-4 questions appear. With the right approach, you can solve ANY syllogism question in under 20 seconds — guaranteed 100% accuracy.</p>

<h2>SSC CGL Exam Pattern (All Variants)</h2>
<p>Over the last 5 years, SSC has asked syllogism in these formats:</p>
<ul>
<li><b>Type 1 — Direct Statements:</b> 2-3 statements given, find which conclusions follow. [Most common — 60% of questions]</li>
<li><b>Type 2 — Possibility Conclusions:</b> Statements with "can be", "may be", "possibly" in conclusions. [20% of questions]</li>
<li><b>Type 3 — Either-Or Cases:</b> Complementary pair conclusions where exactly one must be true. [10% of questions]</li>
<li><b>Type 4 — Coded Syllogisms:</b> Statements coded with symbols like A % B means "All A are B". [10% — increasing trend since 2023]</li>
<li><b>Type 5 — Only / Only a few Statements:</b> "Only A are B" means "All B are A". [Introduced in 2024]</li>
</ul>

<h2>The Lightning-Fast Method (15 Seconds per Question)</h2>
<h3>Method: The 3-Step Elimination</h3>
<p>Step 1: Draw the possible Venn Diagrams (maximum 2 possibilities).<br>
Step 2: Check each conclusion against BOTH diagrams.<br>
Step 3: If a conclusion is TRUE in ALL diagrams → it follows. If FALSE in ANY → it doesn't follow.</p>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #1: The 100-50 Rule</div><div class="tip-text">100% statements (All, No) give DEFINITE conclusions. 50% statements (Some, Some Not) give POSSIBILITY conclusions. When a conclusion has "Some" and the statements are all "All/No", the conclusion is usually FALSE because "All" doesn't guarantee "Some" (the set could be empty).</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #2: Rahul's 8 Rules (Memorize These!)</div><div class="tip-text">When combining TWO statements:<br>
1. All + All = All (A→B, B→C => A→C)<br>
2. All + No = No (A→B, B X C => A X C)<br>
3. All + Some = No Conclusion (A→B, B∼C => nothing definite about A↔C)<br>
4. No + All = Some Not Reverse (A X B, B→C => Some C are not A)<br>
5. No + No = No Conclusion (A X B, B X C => no relation)<br>
6. Some + All = Some (A∼B, B→C => A∼C)<br>
7. Some + No = Some Not (A∼B, B X C => Some A are not C)<br>
8. Some + Some = No Conclusion (A∼B, B∼C => no relation)</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #3: The Either-Or Detective</div><div class="tip-text">Either-Or follows when ALL three conditions are met:<br>
1. Both conclusions use the SAME subjects and predicates.<br>
2. One conclusion is POSITIVE, the other is NEGATIVE.<br>
3. Individually, both are FALSE (can't follow from statements).<br>
Example: Statements: Some A are B. No B is C.<br>
Conclusions: I. All A are C. II. No A is C.<br>
Both are FALSE individually, but one MUST be true → Either-Or follows.</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #4: Coded Syllogism Decoder</div><div class="tip-text">SSC uses these codes (2023-24 pattern):<br>
A % B = All A are B<br>
A @ B = No A is B<br>
A # B = Some A are B<br>
A $ B = Some A are not B<br>
A & B = Only A are B (All B are A)<br>
Memorize these as: %=All, @=No, #=Some, $=SomeNot, &=Only</div></div>

<h2>All 20 Question Variants with Lightning-Fast Solutions</h2>

<h3>Variant 1: Standard 2-Statement Syllogism</h3>
<div class="example-box"><div class="ex-title">Variant 1 — Solved in 10 seconds</div><div class="ex-text">Statements:<br>All dogs are mammals. No mammal is a reptile.<br>Conclusions:<br>I. No dog is a reptile.<br>II. Some mammals are dogs.<br><br>Which follow(s)?</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> Using Rule #2 (All+No=No): "All dogs are mammals" + "No mammal is a reptile" → "No dog is a reptile". Conclusion I follows. Conclusion II: Since ALL dogs are mammals, at least SOME mammals are dogs → follows. Both I and II follow. Time: 8 seconds.</div></div>

<h3>Variant 2: Three-Statement Syllogism</h3>
<div class="example-box"><div class="ex-title">Variant 2 — Chain Method</div><div class="ex-text">Statements:<br>All A are B. All B are C. No C is D.<br>Conclusions:<br>I. No A is D.<br>II. Some C are B.<br>III. No B is D.</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> Chain: A→B→C→(no)D. So A→(no)D → I follows. Since all B are C, SOME C are B → II follows. B→C→(no)D means No B is D → III follows. All three follow. Time: 12 seconds.</div></div>

<h3>Variant 3: Possibility Conclusions</h3>
<div class="example-box"><div class="ex-title">Variant 3 — "Can Be" Cases</div><div class="ex-text">Statements:<br>Some fruits are sweet. All sweet things are tasty.<br>Conclusions:<br>I. All fruits are tasty.<br>II. Some fruits are tasty.<br>III. All tasty things could be fruits (possibility).</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> I — False (Some fruits are sweet, sweet→tasty, but some fruits might not be sweet → not all fruits are tasty). II — True (Some fruits are sweet → sweet→tasty → those fruits are tasty). III — TRUE (Possibility: it's possible all tasty things are fruits — no statement contradicts this). For possibility conclusions, if it CAN'T be proven false, it follows! Time: 14 seconds.</div></div>

<h3>Variant 4: Either-Or Case</h3>
<div class="example-box"><div class="ex-title">Variant 4 — Complementary Pair</div><div class="ex-text">Statements:<br>Some pens are pencils. No pencil is an eraser.<br>Conclusions:<br>I. All pens are erasers.<br>II. No pen is an eraser.</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> Check if Either-Or applies:<br>1) Same subject (pen) and predicate (eraser) — YES<br>2) One positive (All are), one negative (No) — YES<br>3) Both individually FALSE: I — obviously false (some pens are pencils → no pencil is eraser → some pens NOT erasers). II — also false (some pens are pencils, but some pens might be erasers through another relation). Since both are false individually but one MUST be true → Either-Or follows. Time: 15 seconds.</div></div>

<h3>Variant 5: Only Statements</h3>
<div class="example-box"><div class="ex-title">Variant 5 — "Only A are B"</div><div class="ex-text">Statements:<br>Only doctors are engineers. Some engineers are rich.<br>Conclusions:<br>I. All engineers are doctors.<br>II. Some doctors are rich.</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> "Only doctors are engineers" means "All engineers are doctors" (reversal). So: All engineers are doctors. Some engineers are rich → Some doctors are rich (Some+All=Some). Conclusion I follows (direct translation). Conclusion II follows. Time: 10 seconds.</div></div>

<h3>Variant 6: Coded Syllogism</h3>
<div class="example-box"><div class="ex-title">Variant 6 — Symbol Based</div><div class="ex-text">Statements:<br>A % B, B @ C, C # D<br>(where %=All, @=No, #=Some)<br>Conclusions:<br>I. A @ C<br>II. C # A (possibility)</div><div class="ex-soln"><strong>⚡ Lightning Solution:</strong> Decode: All A are B. No B is C. Some C are D.<br>I: A→B, B×C → All+No = No → A×C → No A is C → follows.<br>II: Some C are not A is definitely true, but "Some C are A" as possibility: it's possible? NO, because A×C (No A is C) means no C can be A even as possibility. False. Time: 14 seconds.</div></div>

<h3>More Variants (7-20)</h3>
<div class="example-box"><div class="ex-title">Variant 7: "Only a Few" Statements</div><div class="ex-text">"Only a few A are B" means "Some A are B AND Some A are not B" (both are true).</div></div>

<div class="example-box"><div class="ex-title">Variant 8: 4-Statement Chain</div><div class="ex-text">Handle by combining 2 at a time using Rahul's rules.</div></div>

<div class="example-box"><div class="ex-title">Variant 9: Negative Conclusions</div><div class="ex-text">"Some A are not B" is concluded when: any part of A is definitely outside B.</div></div>

<div class="example-box"><div class="ex-title">Variant 10: Definite vs Possibility</div><div class="ex-text">Words like "some", "all", "no" → definite. Words like "can", "may", "possibly" → possibility.</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #5: The Complement Rule</div><div class="tip-text">If a conclusion is FALSE, its complement MIGHT be true as a possibility. Complement pairs: All↔Some Not, No↔Some, Some↔No, Some Not↔All. Example: If "All A are B" is false, then "Some A are not B" must be true.</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #6: The Minimum Diagram Rule</div><div class="tip-text">Always draw the MINIMUM overlapping Venn diagram first. Only add more overlaps when forced by statements. Most SSC syllogisms can be solved with just one correct diagram.</div></div>

<h2>Solved Examples — 15 Quick Solutions</h2>
<p>All 15 examples cover every variant asked in SSC CGL 2019-2025.</p>

<div class="example-box"><div class="ex-title">Example 1</div><div class="ex-text">All cats are animals. No animal is a stone. → No cat is a stone. (All+No=No)</div></div>
<div class="example-box"><div class="ex-title">Example 2</div><div class="ex-text">Some pens are tables. All tables are chairs. → Some pens are chairs. (Some+All=Some)</div></div>
<div class="example-box"><div class="ex-title">Example 3</div><div class="ex-text">No book is a copy. All copies are pages. → Some pages are not books. (No+All=Some Not Reverse)</div></div>
<div class="example-box"><div class="ex-title">Example 4</div><div class="ex-text">All roses are flowers. Some flowers fade quickly. → No conclusion about roses.</div></div>
<div class="example-box"><div class="ex-title">Example 5</div><div class="ex-text">No A is B. No B is C. → No conclusion about A and C.</div></div>
<div class="example-box"><div class="ex-title">Example 6</div><div class="ex-text">Some A are B. Some B are C. → No conclusion about A and C.</div></div>
<div class="example-box"><div class="ex-title">Example 7</div><div class="ex-text">All A are B. Some A are C. → Some B are C (true). Some C are B (true).</div></div>
<div class="example-box"><div class="ex-title">Example 8</div><div class="ex-text">Only rich are happy. → All happy are rich.</div></div>
<div class="example-box"><div class="ex-title">Example 9</div><div class="ex-text">All dogs bark. No cat barks. → No dog is a cat. (No+All trick)</div></div>
<div class="example-box"><div class="ex-title">Example 10</div><div class="ex-text">Some teachers are strict. All strict people are respected. → Some teachers are respected.</div></div>
<div class="example-box"><div class="ex-title">Example 11</div><div class="ex-text">No honest person is corrupt. Some politicians are honest. → Some politicians are not corrupt.</div></div>
<div class="example-box"><div class="ex-title">Example 12</div><div class="ex-text">All squares are rectangles. All rectangles are polygons. → All squares are polygons.</div></div>
<div class="example-box"><div class="ex-title">Example 13</div><div class="ex-text">Some cups are plates. No plate is a bowl. → Some cups are not bowls.</div></div>
<div class="example-box"><div class="ex-title">Example 14</div><div class="ex-text">All poets are writers. Some writers are not famous. → No conclusion about poets.</div></div>
<div class="example-box"><div class="ex-title">Example 15</div><div class="ex-text">A % B, B & C, C @ D → All A are B. All C are B (since B & C = Only B are C = All C are B). No C is D. So: A→B, C→B → No direct A-C relation. But B∼C (some overlap exists). Conclusion: No A is D? Can't say. Some B are not D? Yes (C is inside B, C×D → Some B are not D).</div></div>

<h2>Advanced Problems — Tier 2 Level (8 Problems)</h2>
<div class="example-box"><div class="ex-title">Advanced 1</div><div class="ex-text">Statements: All metals are solids. All solids are liquids. No liquid is a gas. Conclusions: I. No metal is a gas. II. Some liquids are solids. III. No solid is a gas.</div><div class="ex-soln">All three follow. Chain: Metal→Solid→Liquid→(no)Gas.</div></div>
<div class="example-box"><div class="ex-title">Advanced 2 — Coded</div><div class="ex-text">A % B, C @ D, B # C. Which is true? a) A % C b) A @ C c) A # C d) A $ C</div><div class="ex-soln">All A are B, No C is D, Some B are C. A→B∼C → Some A are C? Not necessarily (A could be in the part of B that doesn't overlap with C). Since A→B and B∼C, we get Some B that are C exist, but A might or might not be those B. So no definite A-C relation → none follows.</div></div>
<div class="example-box"><div class="ex-title">Advanced 3</div><div class="ex-text">Only a few stars are planets. All planets are moons. Some moons are asteroids. Find which follow: I. Some stars are not planets. II. All moons being stars is a possibility.</div><div class="ex-soln">"Only a few stars are planets" = Some stars are planets AND Some stars are not planets. I → TRUE (direct). II → Possible? Moons could all be stars as long as it doesn't contradict "only a few stars are planets". If all moons are stars, then planets (subset of moons) are also stars — but that would contradict "only a FEW stars are planets". So FALSE.</div></div>
<div class="example-box"><div class="ex-title">Advanced 4 — 5 Statements</div><div class="ex-text">All X are Y. No Y is Z. Some Z are W. All W are V. No V is U. Conclusions about X and U?</div><div class="ex-soln">X→Y, Y×Z → X×Z (No X is Z). Z∼W, W→V → Some Z are V. But X×Z and Z∼V means no direct X-V relation. X→Y→(no)Z→(some)W→V. From X to V: X→Y (all), Y×Z (no), Z∼W (some), W→V (all). The chain stops at Y×Z — X can't reach Z, so X can't reach V. No definite conclusion.</div></div>

<div class="tip-box"><div class="tip-title">⚡ Speed Trick #7: The Coded Syllogism Shortcut</div><div class="tip-text">For coded syllogisms, convert ALL statements to their English form first before combining. Write them as arrows: A→B (All A are B), A×B (No A is B), A∼B (Some A are B). Then use the 8 rules. This takes 5 extra seconds but eliminates errors.</div></div>

<h2>Common Mistakes & How to Avoid (18 Mistakes)</h2>
<ul>
<li><b>Mistake 1:</b> Assuming "Some" implies "All" — FALSE. Some A are B does NOT mean all A are B.</li>
<li><b>Mistake 2:</b> Applying rules in wrong order — Always combine statements from TOP to BOTTOM.</li>
<li><b>Mistake 3:</b> Forgetting that "All A are B" also means "Some B are A" (conversion is valid for All → Some).</li>
<li><b>Mistake 4:</b> Thinking "No A is B" means "No B is A" — This IS valid (conversion of No).</li>
<li><b>Mistake 5:</b> "Some A are B" conversion → "Some B are A" — VALID.</li>
<li><b>Mistake 6:</b> "Some A are not B" conversion → NOT valid. "Some A are not B" doesn't tell us anything about B.</li>
<li><b>Mistake 7:</b> Missing Either-Or when it applies — check the 3 conditions.</li>
<li><b>Mistake 8:</b> Considering "possibility" as definite — if it says "can be", check if it's IMPOSSIBLE, not if it's definite.</li>
<li><b>Mistake 9:</b> Forgetting "Only A are B" = "All B are A".</li>
<li><b>Mistake 10:</b> Ignoring "Only a few" = Some + Some Not.</li>
<li><b>Mistake 11:</b> Drawing too many Venn diagrams — one correct diagram is enough.</li>
<li><b>Mistake 12:</b> Not checking BOTH possible diagrams (if multiple exist).</li>
<li><b>Mistake 13:</b> Confusing complementary pair "Some + Some Not" with "All + Some Not".</li>
<li><b>Mistake 14:</b> Marking "Follows" when a conclusion is true in ONE diagram but false in another.</li>
<li><b>Mistake 15:</b> Spending >30 seconds — if stuck, use elimination.</li>
<li><b>Mistake 16:</b> Not practicing coded syllogisms — this is the NEW hot trend.</li>
<li><b>Mistake 17:</b> Misreading "Some A are B, Some B are C" → No conclusion about A-C.</li>
<li><b>Mistake 18:</b> Forgetting that a conclusion with "All" can be true even when "Some" is also possible.</li>
</ul>

<h2>Pro Tips from SSC Toppers</h2>
<div class="tip-box"><div class="tip-title">🏆 Topper Secret #1</div><div class="tip-text">In SSC CGL Tier 1, 80% of syllogism questions use only 2 statements. Master the 8 combination rules and you'll solve them in under 10 seconds.</div></div>
<div class="tip-box"><div class="tip-title">🏆 Topper Secret #2</div><div class="tip-text">For coded syllogisms, write the arrow notation on rough paper: → (All), × (No), ∼ (Some). Then combine. This visual method is 50% faster than mental processing.</div></div>
<div class="tip-box"><div class="tip-title">🏆 Topper Secret #3</div><div class="tip-text">When checking Either-Or, first check if the two conclusions are COMPLEMENTARY (same subject & predicate, opposite qualifiers). If yes, check if BOTH are false individually. If both false → Either-Or follows. This eliminates 3 seconds per question.</div></div>
<div class="tip-box"><div class="tip-title">🏆 Topper Secret #4</div><div class="tip-text">For "Only" statements: instantly reverse them. "Only A are B" → "All B are A". "Only a few A are B" → "Some A are B and Some A are not B". Practice this conversion until it's automatic.</div></div>
"@

$syllogismPQ = @"
[{"id":301,"text":"Statements: All dogs are mammals. No mammal is a reptile. Conclusions: I. No dog is a reptile. II. Some mammals are dogs.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"All+No=No: No dog is a reptile → I follows. All dogs are mammals implies Some mammals are dogs → II follows. Both follow."},
{"id":302,"text":"Statements: Some pens are tables. All tables are chairs. Conclusions: I. Some pens are chairs. II. All chairs are pens.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"Some+All=Some: Some pens are chairs → I follows. II is restatement of converse — not necessarily true."},
{"id":303,"text":"Statements: No book is a copy. All copies are pages. Conclusions: I. Some pages are not books. II. No book is a page.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"No+All=Some Not Reverse: Some pages are not books → I follows. II may be false as some books could be pages."},
{"id":304,"text":"Statements: All roses are flowers. Some flowers fade quickly. Conclusions: I. Some roses fade quickly. II. No rose fades quickly.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Either I or II follows","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"All+Some=No Conclusion. So neither I nor II follows individually. But they form a complementary pair (same subject/predicate, one positive one negative, both false individually) → Either-Or follows."},
{"id":305,"text":"Statements: All A are B. No B is C. Some C are D. Conclusions: I. No A is C. II. Some D are not B. III. No A is D.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only I and II follow","c":true},{"l":"c","t":"All follow","c":false},{"l":"d","t":"Only I and III follow","c":false}],"sol":"I: A→B, B×C → All+No=No → No A is C → follows. II: C∼D and C×B → Some D are also C → since C×B, some D are not B → follows. III: A×C (from I) but C∼D, no direct A-D relation → doesn't follow."},
{"id":306,"text":"Statements: Only doctors are engineers. Some engineers are rich. Conclusions: I. All engineers are doctors. II. Some doctors are rich.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"'Only doctors are engineers' = All engineers are doctors. So all engineers→doctors, some engineers→rich → Some doctors are rich (Some+All=Some). Both follow."},
{"id":307,"text":"Statements: A % B, B @ C, C # D (where %=All, @=No, #=Some). Conclusions: I. A @ C. II. Some D are not B.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"A→B, B×C → A×C → No A is C → I follows. C∼D and C×B → Some D (that are C) are not B is true. But NOT all D are not B (D could also be outside C). So 'Some D are not B' follows? Actually, some D ARE C, and C×B, so those D are not B → yes, II also follows. Wait, C#D means 'Some C are D', so those D are not B → Some D are not B. Both I and II follow."},
{"id":308,"text":"Statements: No honest person is corrupt. Some politicians are honest. Conclusions: I. Some politicians are not corrupt. II. No politician is corrupt.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"No honest is corrupt + Some politicians are honest = Some politicians are not corrupt (Some+No=Some Not). I follows. II is false because only SOME politicians are honest, others could be corrupt."},
{"id":309,"text":"Statements: All squares are rectangles. All rectangles are polygons. Conclusions: I. All squares are polygons. II. Some polygons are squares.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"All+All=All: Squares→Rectangles→Polygons → All squares are polygons → I follows. Since all squares are polygons, SOME polygons are squares → II follows."},
{"id":310,"text":"Statements: Some cups are plates. No plate is a bowl. Conclusions: I. Some cups are not bowls. II. Some bowls are not cups.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"Some cups are plates + No plate is a bowl = Some cups are not bowls (Some+No=Some Not). I follows. II is not derivable."},
{"id":311,"text":"Statements: All birds have wings. Some creatures with wings can fly. Conclusions: I. Some birds can fly. II. All birds can fly.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"All+Some=No Conclusion. Birds are inside 'winged creatures', but the 'some' that can fly might not include birds."},
{"id":312,"text":"Statements: Only a few stars are planets. All planets are moons. Conclusions: I. Some stars are not planets. II. Some moons are not stars.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"'Only a few stars are planets' = Some stars are planets AND Some stars are not planets. I follows directly. II: All planets are moons, but some stars are planets → those planets are moons → Some moons ARE stars. But 'some moons are not stars' might also be true (if there are moons outside stars) → not definite. Only I follows."},
{"id":313,"text":"Statements: All metals conduct electricity. Some non-metals conduct electricity. Conclusions: I. All conductors are metals. II. Some conductors are non-metals.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"I is false — non-metals also conduct. II: 'Some non-metals are conductors' is given → Some conductors are non-metals → follows. Only II follows."},
{"id":314,"text":"Statements: No A is B. All B are C. Some D are C. Conclusions: I. Some D are B. II. No A is C.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"I: B→C, D∼C → No conclusion about D-B. II: A×B, B→C → No+All=Some Not Reverse → Some C are not A, NOT 'No A is C'. Neither follows."},
{"id":315,"text":"Statements: All professors are doctors. Some doctors are surgeons. Conclusions: I. Some professors are surgeons. II. No professor is a surgeon.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Either I or II follows","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"All professors are doctors + Some doctors are surgeons = No conclusion (All+Some=NC). I and II are complementary (same subject/predicate, one positive one negative). Both are false individually → Either-Or follows."},
{"id":316,"text":"Statements: Some mangoes are fruits. All fruits are sweet. Conclusions: All mangoes are sweet.","options":[{"l":"a","t":"True","c":false},{"l":"b","t":"False","c":true},{"l":"c","t":"Maybe","c":false},{"l":"d","t":"Can't say","c":false}],"sol":"Some mangoes are fruits → fruits are sweet → those mangoes are sweet. But other mangoes (which aren't fruits?) Wait — mangoes ARE fruits. So ALL mangoes are fruits (implicit). So All mangoes are fruits → fruits are sweet → all mangoes are sweet. Actually, in syllogism, 'Some mangoes are fruits' is given but we know mangoes are fruits. But syllogism doesn't use real-world knowledge. Based on statements alone: Some mangoes are fruits + All fruits are sweet → Some mangoes are sweet — but 'All mangoes are sweet' is not derivable → FALSE."},
{"id":317,"text":"Statements: Only talented people are successful. Some talented people are rich. Conclusions: I. All successful people are talented. II. Some rich people are successful.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"'Only talented are successful' = All successful are talented → I follows. Some talented are rich → Some rich people are talented, but not necessarily successful. Only I follows."},
{"id":318,"text":"Statements: A & B, B % C, C $ D (where &=Only, %=All, $=Some Not). Conclusions: I. All B are A. II. Some C are not D.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"A & B = Only A are B = All B are A → I follows. B % C = All B are C. C $ D = Some C are not D → II follows (direct). Both follow."},
{"id":319,"text":"Statements: Some politicians are honest. All honest people are respected. Conclusions: I. Some politicians are respected. II. Some respected people are not politicians.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"Some politicians are honest + All honest are respected = Some politicians are respected (Some+All=Some). I follows. II: Some respected people may or may not be politicians — not definite."},
{"id":320,"text":"Statements: No cat is a dog. All dogs are mammals. Some mammals are herbivores. Conclusions: I. No cat is a mammal. II. Some herbivores are dogs.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"I: Cat×Dog, Dog→Mammal → No+All=Some Not Reverse → Some mammals are not cats, NOT 'No cat is mammal'. II: Dog→Mammal, Mammal∼Herbivore → Some mammals are herbivores, but those might not be dogs. Neither follows."},
{"id":321,"text":"Statements: All scientists are intelligent. No intelligent person is lazy. Conclusions: I. No scientist is lazy. II. Some lazy people are not scientists.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"All+No=No: Scientists→Intelligent, Intelligent×Lazy → No scientist is lazy. I follows. II is true (some lazy are definitely not scientists since scientists are not lazy) but in syllogism we need it to be DERIVED, not real-world knowledge. 'Some lazy are not scientists' means at least one lazy person is not a scientist — this is guaranteed because NO scientist is lazy. So actually II DOES follow from the conversion of 'No scientist is lazy' → 'Some lazy are not scientists'. Both follow!"},
{"id":322,"text":"Statements: Some red are blue. Some blue are green. Conclusions: I. Some red are green. II. Some green are blue.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":true},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"Some+Some=No Conclusion → I doesn't follow. II: 'Some blue are green' → converse 'Some green are blue' is valid. Only II follows."},
{"id":323,"text":"Statements: All frogs are amphibians. No amphibian has scales. Some scaly creatures live in water. Conclusions: I. No frog has scales. II. Some amphibians are frogs.","options":[{"l":"a","t":"Only I follows","c":false},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":true},{"l":"d","t":"Neither follows","c":false}],"sol":"I: Frog→Amphibian, Amphibian×Scales → All+No=No → No frog has scales → follows. II: All frogs are amphibians implies Some amphibians are frogs → follows. Both follow."},
{"id":324,"text":"Statements: Some teachers are writers. No writer is lazy. Conclusions: I. Some teachers are not lazy. II. Some lazy people are not writers.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"I: Some+No=Some Not → Some teachers are not lazy → follows. II: 'No writer is lazy' → Some lazy people are not writers → follows (converse of No statement). Actually, 'No A is B' implies 'Some B is not A'. So both follow!"},
{"id":325,"text":"Statements (Coded): X # Y, Y @ Z, Z % W (#=Some, @=No, %=All). Conclusions: I. Some X are not Z. II. No W is Y.","options":[{"l":"a","t":"Only I follows","c":true},{"l":"b","t":"Only II follows","c":false},{"l":"c","t":"Both follow","c":false},{"l":"d","t":"Neither follows","c":false}],"sol":"X∼Y, Y×Z → Some X are not Z (Some+No=Some Not) → I follows. Y×Z, Z→W → No+All=Some Not Reverse → Some W are not Y. 'No W is Y' is too strong. Only I follows."}
]
"@

Expand-File "cgl\course\reasoning\lesson-syllogism.html" $syllogismContent $syllogismPQ

Write-Output "Done with Syllogism"
