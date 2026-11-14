const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'course-data.json');
const PRACTICE = path.join(__dirname, 'course-practice.json');

function inject(key, content, qs) {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  data[key] = content;
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const practice = JSON.parse(fs.readFileSync(PRACTICE, 'utf8'));
  practice[key] = qs.map((q, i) => ({
    id: 4001 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-dogri/paper3', `<h3>Dogri Paper II - Dogri Literature (Modern &amp; Folk Literature)</h3>
<h3>Modern Dogri Literature</h3>
<ul>
<li><strong>Modern Dogri Poetry:</strong> Modern Dogri poetry began in the early 20th century with poets like Shiv Nath Shastri, who introduced modern themes and forms.</li>
<li><strong>Major Modern Poets:</strong> Padma Sachdev, Master Zia, Santosh Sharma, Kailash Chander, Madan Mohan Sharma, Surinder Singh, Krishan Chander.</li>
<li><strong>Themes:</strong> Love, nature, social justice, patriotism, women's empowerment, existentialism, modernity, love and romance.</li>
</ul>
<h3>Major Modern Dogri Writers</h3>
<ul>
<li><strong>Shiv Nath Shastri:</strong> Known as the father of modern Dogri literature; major works include "Pita Putra," "Mangal Deedar," "Deewar." Known for nationalist and patriotic themes.</li>
<li><strong>Padma Sachdev:</strong> First woman Dogri poet to win Sahitya Akademi Award (1981) for her autobiography "Mithi Deewar"; known for feminist themes and emotional depth.</li>
<li><strong>Master Zia:</strong> Known as "Kaka" of Dogri poetry; known for revolutionary and progressive poetry; simplicity and emotional depth.</li>
<li><strong>Santan Suman:</strong> Known for his contribution to Dogri poetry and short stories; known for simplicity and emotional depth.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: Modern Dogri Literature</div><div class="ex-text">Question: "Discuss the contribution of Padma Sachdev to Dogri literature."</div><div class="ex-soln">Answer: Padma Sachdev (1940-2020) was the first woman Dogri poet to win the Sahitya Akademi Award (1981) for her autobiography "Mithi Deewar." She is known for her feminist themes, emotional depth, and lyrical quality. Her major works include "Mithi Deewar" (autobiography), "Main Teri Mera..." (poetry collection), and "Dharti Di Devi" (short story collection). She brought women's perspectives and feminist themes to Dogri literature.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing Dogri with Punjabi or Punjabi-influenced languages - Dogri is a distinct language with its own identity.</li>
<li>Missing that Dogri literature has both oral and written traditions.</li>
<li>Missing that Dogri literature has both folk and modern traditions.</li>
<li>Missing the role of Dogri Sanstha and other organizations in promoting Dogri literature.</li>
<li>Overlooking the role of Jammu region in Dogri literature.</li>
</ul>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Major Dogri Writers:</strong> Shiv Nath Shastri (father of modern Dogri literature), Padma Sachdev (first woman Sahitya Akademi winner), Master Zia (people's poet), Santosh Sharma (modern poet).</li>
<li><strong>Major Works:</strong> Pita Putra (Shiv Nath Shastri), Mangal Deewar (Padma Sachdev), Dard Ki Holi (Master Zia), Santan Suman (Santan Suman).</li>
<li><strong>Major Themes:</strong> Love and romance, rural life, social justice, women's empowerment, cultural identity, spirituality.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains Strategy</div><div class="tip-text">Dogri literature answers: trace historical development from oral to written literature; mention key writers and their works; discuss themes and forms; cite specific works and authors; compare with other modern Indian literatures; discuss Dogri's contribution to Indian literature.</div></div>`, [
  {
    text: "Who is known as the father of modern Dogri literature?",
    options: ["Shiv Nath Shastri", "Padma Sachdev", "Master Zia", "Santan Suman"],
    correct: 0,
    sol: "Shiv Nath Shastri is considered the father of modern Dogri literature for his pioneering work in modern Dogri literature." },
  {
    text: "Which Dogri poet was the first woman to win the Sahitya Akademi Award?",
    options: ["Padma Sachdev", "Shiv Nath Shastri", "Master Zia", "Santan Suman"],
    correct: 0,
    sol: "Padma Sachdev was the first woman Dogri poet to win the Sahitya Akademi Award in 1981 for her autobiography 'Mithi Deewar'." },
  {
    text: "Master Zia is popularly known as:",
    options: ["Kaka", "Baba", "Guru", "Master Ji"],
    correct: 0,
    sol: "Master Zia is popularly known as 'Kaka' of Dogri poetry." },
  {
    text: "Which Dogri poet wrote 'Mithi Deewar'?",
    options: ["Padma Sachdev", "Shiv Nath Shastri", "Master Zia", "Santan Suman"],
    correct: 0,
    sol: "Padma Sachdev wrote 'Mithi Deewar' (My Earthen Wall), an autobiographical work for which she received the Sahitya Akademi Award in 1981." },
  {
    text: "Which of the following is NOT a major theme in Dogri literature?",
    options: ["Love and romance", "Social justice", "Rural life", "Space exploration"],
    correct: 3,
    sol: "Space exploration is not a major theme in Dogri literature. Major themes include love, social justice, rural life, cultural identity, and spirituality." }
]);
