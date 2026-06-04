var fs = require('fs');
var path = require('path');

var BANK = path.join(__dirname, '..', 'question-bank', 'agniveer.json');
var data = JSON.parse(fs.readFileSync(BANK, 'utf-8'));

var questions = data.questions;

// ----- DEDUPLICATION -----
var seen = {};
var deduped = [];
var removed = 0;
questions.forEach(function(q){
  var key = q.text.trim().toLowerCase();
  if (seen[key]) { removed++; return; }
  seen[key] = true;
  deduped.push(q);
});
console.log('Removed ' + removed + ' duplicate questions. Remaining: ' + deduped.length);

// ----- NEW QUESTIONS -----
var newQuestions = [];

// --- General Knowledge (15 new) ---
newQuestions.push({
  "section": "General Knowledge",
  "text": "Which of the following is NOT a Fundamental Right under the Indian Constitution?",
  "options": [
    { "label": "A", "text": "Right to Equality", "correct": false },
    { "label": "B", "text": "Right to Freedom", "correct": false },
    { "label": "C", "text": "Right to Property", "correct": true },
    { "label": "D", "text": "Right to Constitutional Remedies", "correct": false }
  ],
  "solution": "Right to Property (Article 31) was originally a Fundamental Right but was removed by the 44th Amendment Act, 1978. It is now a legal right under Article 300A."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The 'Deep Ocean Mission' of India is primarily associated with which ministry?",
  "options": [
    { "label": "A", "text": "Ministry of Earth Sciences", "correct": true },
    { "label": "B", "text": "Ministry of Defence", "correct": false },
    { "label": "C", "text": "Ministry of Science and Technology", "correct": false },
    { "label": "D", "text": "Ministry of Environment, Forest and Climate Change", "correct": false }
  ],
  "solution": "The Deep Ocean Mission (DOM) is India's flagship deep-sea exploration initiative under the Ministry of Earth Sciences (MoES) with a budget of ~Rs. 4,077 crore."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "Which pass connects the Kashmir Valley with Ladakh?",
  "options": [
    { "label": "A", "text": "Khardung La", "correct": false },
    { "label": "B", "text": "Zoji La", "correct": true },
    { "label": "C", "text": "Nathu La", "correct": false },
    { "label": "D", "text": "Shipki La", "correct": false }
  ],
  "solution": "Zoji La pass (3528 m) connects Srinagar (Kashmir Valley) with Leh (Ladakh) on the Srinagar-Leh highway. Khardung La is near Leh, Nathu La is Sikkim-China border, Shipki La is Himachal-China border."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The 'Maternity Benefit Programme' under PMMVY provides financial assistance of how much amount?",
  "options": [
    { "label": "A", "text": "Rs. 5000", "correct": false },
    { "label": "B", "text": "Rs. 6000", "correct": false },
    { "label": "C", "text": "Rs. 5000 + Rs. 1000 per child", "correct": false },
    { "label": "D", "text": "Rs. 5000 in two instalments", "correct": true }
  ],
  "solution": "Pradhan Mantri Matru Vandana Yojana (PMMVY) provides Rs. 5000 in two instalments to pregnant and lactating women for the first living child, with an additional Rs. 1000 from JSY."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The tropic of cancer passes through how many Indian states?",
  "options": [
    { "label": "A", "text": "6", "correct": false },
    { "label": "B", "text": "7", "correct": false },
    { "label": "C", "text": "8", "correct": true },
    { "label": "D", "text": "9", "correct": false }
  ],
  "solution": "Tropic of Cancer (23.5°N) passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "Who among the following was the last Governor-General of independent India?",
  "options": [
    { "label": "A", "text": "Lord Mountbatten", "correct": false },
    { "label": "B", "text": "C. Rajagopalachari", "correct": true },
    { "label": "C", "text": "Dr. Rajendra Prasad", "correct": false },
    { "label": "D", "text": "Lord Wavell", "correct": false }
  ],
  "solution": "C. Rajagopalachari (CR) was the last Governor-General of independent India (1948-1950). Lord Mountbatten was the first. Dr. Rajendra Prasad became the first President when India became a republic in 1950."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "ISRO's 'LVM3' launch vehicle is specifically designed for which class of missions?",
  "options": [
    { "label": "A", "text": "Polar satellite launches", "correct": false },
    { "label": "B", "text": "Geostationary and crew-rated missions", "correct": true },
    { "label": "C", "text": "Sub-orbital sounding rockets", "correct": false },
    { "label": "D", "text": "Interplanetary missions only", "correct": false }
  ],
  "solution": "LVM3 (formerly GSLV Mk III) is designed for launching geostationary satellites (4-ton class) and is ISRO's crew-rated launcher for the Gaganyaan human spaceflight mission."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "Which of the following tribes is primarily associated with the Nilgiri Hills?",
  "options": [
    { "label": "A", "text": "Santhal", "correct": false },
    { "label": "B", "text": "Bhil", "correct": false },
    { "label": "C", "text": "Toda", "correct": true },
    { "label": "D", "text": "Gond", "correct": false }
  ],
  "solution": "The Toda tribe is native to the Nilgiri Hills of Tamil Nadu. Santhal (Jharkhand), Bhil (MP/Rajasthan/Gujarat), Gond (Central India). The Toda are known for their distinctive embroidered shawls and pastoral lifestyle."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "In the context of the Indian economy, 'Base Year' for GDP calculation is currently:",
  "options": [
    { "label": "A", "text": "2010-11", "correct": false },
    { "label": "B", "text": "2011-12", "correct": true },
    { "label": "C", "text": "2014-15", "correct": false },
    { "label": "D", "text": "2016-17", "correct": false }
  ],
  "solution": "The current base year for India's GDP estimation is 2011-12. It was revised from 2004-05 to 2011-12 in January 2015. A revision to 2017-18 or 2020-21 has been under discussion."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The 'Garib Kalyan Rojgar Abhiyaan' was launched to provide employment in how many districts?",
  "options": [
    { "label": "A", "text": "75", "correct": false },
    { "label": "B", "text": "100", "correct": false },
    { "label": "C", "text": "116", "correct": true },
    { "label": "D", "text": "150", "correct": false }
  ],
  "solution": "Garib Kalyan Rojgar Abhiyaan was launched in June 2020 covering 116 districts across 6 states (Bihar, UP, MP, Rajasthan, Jharkhand, Odisha) to provide employment to returning migrant workers."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "Which Indian state was formerly known as 'North-East Frontier Agency' (NEFA)?",
  "options": [
    { "label": "A", "text": "Nagaland", "correct": false },
    { "label": "B", "text": "Arunachal Pradesh", "correct": true },
    { "label": "C", "text": "Mizoram", "correct": false },
    { "label": "D", "text": "Meghalaya", "correct": false }
  ],
  "solution": "Arunachal Pradesh was formerly known as NEFA (North-East Frontier Agency). It was renamed Arunachal Pradesh in 1972 and became a full state in 1987."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The 'Global Gender Gap Index' is published by which organization?",
  "options": [
    { "label": "A", "text": "World Bank", "correct": false },
    { "label": "B", "text": "World Economic Forum", "correct": true },
    { "label": "C", "text": "UNDP", "correct": false },
    { "label": "D", "text": "UN Women", "correct": false }
  ],
  "solution": "The Global Gender Gap Index is published annually by the World Economic Forum (WEF). Iceland, Norway, and Finland consistently top the rankings."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "As per the Constitution of India, the power to create a new All India Service rests with:",
  "options": [
    { "label": "A", "text": "The President", "correct": false },
    { "label": "B", "text": "The Parliament", "correct": true },
    { "label": "C", "text": "The Union Cabinet", "correct": false },
    { "label": "D", "text": "The UPSC", "correct": false }
  ],
  "solution": "Article 312 of the Constitution empowers Parliament to create new All India Services (like IAS, IPS, IFoS) by a two-thirds majority in the Rajya Sabha."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "Which Indian military operation was launched to evict Pakistani forces from the Kargil sector in 1999?",
  "options": [
    { "label": "A", "text": "Operation Vijay", "correct": true },
    { "label": "B", "text": "Operation Parakram", "correct": false },
    { "label": "C", "text": "Operation Meghdoot", "correct": false },
    { "label": "D", "text": "Operation Safed Sagar", "correct": false }
  ],
  "solution": "Operation Vijay (May-July 1999) was the Indian Armed Forces operation to clear Pakistani infiltrators from the Kargil sector. Operation Meghdoot was for Siachen (1984), Operation Parakram was post-2001 Parliament attack mobilization."
});
newQuestions.push({
  "section": "General Knowledge",
  "text": "The 'Earth Hour' campaign is associated with which global environmental issue?",
  "options": [
    { "label": "A", "text": "Deforestation", "correct": false },
    { "label": "B", "text": "Climate change", "correct": true },
    { "label": "C", "text": "Ocean acidification", "correct": false },
    { "label": "D", "text": "Ozone depletion", "correct": false }
  ],
  "solution": "Earth Hour, organized by WWF, is a worldwide movement where individuals and landmarks turn off non-essential lights for one hour on the last Saturday of March to raise awareness about climate change and energy conservation."
});

// --- Mathematics (15 new) ---
newQuestions.push({
  "section": "Mathematics",
  "text": "A shopkeeper marks an item 40% above the cost price and offers a discount of 25%. What is his profit or loss percentage?",
  "options": [
    { "label": "A", "text": "5% profit", "correct": true },
    { "label": "B", "text": "10% profit", "correct": false },
    { "label": "C", "text": "5% loss", "correct": false },
    { "label": "D", "text": "No profit no loss", "correct": false }
  ],
  "solution": "Let CP = 100. Marked Price = 140. Discount = 25% of 140 = 35. SP = 140 - 35 = 105. Profit = 105 - 100 = 5%. So 5% profit."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "A and B together can complete a work in 12 days. B alone can complete it in 30 days. How many days will A alone take to complete the work?",
  "options": [
    { "label": "A", "text": "15 days", "correct": false },
    { "label": "B", "text": "18 days", "correct": false },
    { "label": "C", "text": "20 days", "correct": true },
    { "label": "D", "text": "24 days", "correct": false }
  ],
  "solution": "A+B 1-day work = 1/12. B's 1-day work = 1/30. A's 1-day work = 1/12 - 1/30 = (5-2)/60 = 3/60 = 1/20. So A alone takes 20 days."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "A train 300 m long passes a platform 200 m long in 25 seconds. What is the speed of the train in km/h?",
  "options": [
    { "label": "A", "text": "54 km/h", "correct": false },
    { "label": "B", "text": "60 km/h", "correct": false },
    { "label": "C", "text": "72 km/h", "correct": true },
    { "label": "D", "text": "80 km/h", "correct": false }
  ],
  "solution": "Total distance = 300 + 200 = 500 m. Time = 25 s. Speed = 500/25 = 20 m/s. In km/h = 20 × 18/5 = 72 km/h."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "If 15% of a number is 45, what is 25% of that number?",
  "options": [
    { "label": "A", "text": "60", "correct": false },
    { "label": "B", "text": "75", "correct": true },
    { "label": "C", "text": "80", "correct": false },
    { "label": "D", "text": "90", "correct": false }
  ],
  "solution": "Let number = x. 15% of x = 45 => x = 45 × 100/15 = 300. 25% of 300 = 75."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "The simple interest on Rs. 6000 at 8% per annum for 3 years is:",
  "options": [
    { "label": "A", "text": "Rs. 1200", "correct": false },
    { "label": "B", "text": "Rs. 1360", "correct": false },
    { "label": "C", "text": "Rs. 1440", "correct": true },
    { "label": "D", "text": "Rs. 1500", "correct": false }
  ],
  "solution": "SI = P × R × T / 100 = 6000 × 8 × 3 / 100 = 60 × 24 = Rs. 1440."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "A man completes a journey in 8 hours. He travels half the distance at 40 km/h and the other half at 60 km/h. What is the total distance?",
  "options": [
    { "label": "A", "text": "360 km", "correct": false },
    { "label": "B", "text": "384 km", "correct": true },
    { "label": "C", "text": "400 km", "correct": false },
    { "label": "D", "text": "420 km", "correct": false }
  ],
  "solution": "Let total distance = 2x km. Time for first half = x/40 h, second half = x/60 h. Total time = x/40 + x/60 = (3x+2x)/120 = 5x/120 = x/24 = 8 => x = 192. Total distance = 2 × 192 = 384 km."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "If the compound interest on a sum for 2 years at 10% per annum is Rs. 1260, what is the principal?",
  "options": [
    { "label": "A", "text": "Rs. 5000", "correct": false },
    { "label": "B", "text": "Rs. 5500", "correct": false },
    { "label": "C", "text": "Rs. 6000", "correct": true },
    { "label": "D", "text": "Rs. 6400", "correct": false }
  ],
  "solution": "CI = P[(1 + R/100)^2 - 1] => 1260 = P[(1.1)^2 - 1] = P[1.21 - 1] = P × 0.21 => P = 1260/0.21 = Rs. 6000."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "Two numbers are in the ratio 4:7. If their sum is 121, find the difference between the numbers.",
  "options": [
    { "label": "A", "text": "27", "correct": false },
    { "label": "B", "text": "30", "correct": false },
    { "label": "C", "text": "33", "correct": true },
    { "label": "D", "text": "36", "correct": false }
  ],
  "solution": "4x + 7x = 11x = 121 => x = 11. Numbers: 44 and 77. Difference = 77 - 44 = 33."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "The LCM of two numbers is 240 and their HCF is 12. If one number is 60, what is the other number?",
  "options": [
    { "label": "A", "text": "36", "correct": false },
    { "label": "B", "text": "48", "correct": true },
    { "label": "C", "text": "72", "correct": false },
    { "label": "D", "text": "96", "correct": false }
  ],
  "solution": "Product of numbers = LCM × HCF => 60 × other = 240 × 12 => other = (240 × 12) / 60 = 48."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "A can do a piece of work in 10 days and B in 15 days. They work together for 3 days and then A leaves. How many more days will B take to finish the work?",
  "options": [
    { "label": "A", "text": "6 days", "correct": false },
    { "label": "B", "text": "7.5 days", "correct": true },
    { "label": "C", "text": "8 days", "correct": false },
    { "label": "D", "text": "9 days", "correct": false }
  ],
  "solution": "A's 1-day = 1/10, B's 1-day = 1/15. Combined 1-day = 1/10+1/15 = 1/6. Work done in 3 days = 3/6 = 1/2. Remaining = 1/2. B's time = (1/2)/(1/15) = 15/2 = 7.5 days."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "The perimeter of a rectangle is 80 m and its length is 4 m more than its breadth. What is the area of the rectangle?",
  "options": [
    { "label": "A", "text": "384 sq m", "correct": false },
    { "label": "B", "text": "396 sq m", "correct": true },
    { "label": "C", "text": "400 sq m", "correct": false },
    { "label": "D", "text": "420 sq m", "correct": false }
  ],
  "solution": "Let breadth = x, length = x+4. Perimeter = 2(x + x+4) = 2(2x+4) = 4x+8 = 80 => x = 18. Area = 22 × 18 = 396 sq m."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "If 3 coins are tossed simultaneously, what is the probability of getting exactly 2 heads?",
  "options": [
    { "label": "A", "text": "1/8", "correct": false },
    { "label": "B", "text": "3/8", "correct": true },
    { "label": "C", "text": "1/2", "correct": false },
    { "label": "D", "text": "5/8", "correct": false }
  ],
  "solution": "Total outcomes = 8 (HHH, HHT, HTH, THH, HTT, THT, TTH, TTT). Favorable (exactly 2 heads) = HHT, HTH, THH = 3. Probability = 3/8."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "The average of 5 numbers is 18. If one number is removed, the average becomes 16. What is the removed number?",
  "options": [
    { "label": "A", "text": "20", "correct": false },
    { "label": "B", "text": "22", "correct": false },
    { "label": "C", "text": "24", "correct": false },
    { "label": "D", "text": "26", "correct": true }
  ],
  "solution": "Sum of 5 numbers = 5 × 18 = 90. Sum of 4 numbers = 4 × 16 = 64. Removed number = 90 - 64 = 26."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "If x + 1/x = 3, what is the value of x^2 + 1/x^2?",
  "options": [
    { "label": "A", "text": "5", "correct": false },
    { "label": "B", "text": "7", "correct": true },
    { "label": "C", "text": "9", "correct": false },
    { "label": "D", "text": "11", "correct": false }
  ],
  "solution": "(x + 1/x)^2 = x^2 + 1/x^2 + 2 => 3^2 = x^2 + 1/x^2 + 2 => 9 = x^2 + 1/x^2 + 2 => x^2 + 1/x^2 = 7."
});
newQuestions.push({
  "section": "Mathematics",
  "text": "A man sold a watch at a loss of 10%. If he had sold it for Rs. 45 more, he would have made a profit of 5%. What is the cost price of the watch?",
  "options": [
    { "label": "A", "text": "Rs. 250", "correct": false },
    { "label": "B", "text": "Rs. 300", "correct": true },
    { "label": "C", "text": "Rs. 350", "correct": false },
    { "label": "D", "text": "Rs. 400", "correct": false }
  ],
  "solution": "Let CP = x. SP at 10% loss = 0.9x. SP at 5% profit = 1.05x. Difference = 1.05x - 0.9x = 0.15x = 45 => x = 300."
});

// --- Science (15 new) ---
newQuestions.push({
  "section": "Science",
  "text": "Which of the following is the SI unit of electric current?",
  "options": [
    { "label": "A", "text": "Volt", "correct": false },
    { "label": "B", "text": "Ampere", "correct": true },
    { "label": "C", "text": "Ohm", "correct": false },
    { "label": "D", "text": "Watt", "correct": false }
  ],
  "solution": "The SI unit of electric current is Ampere (A). 1 ampere = 1 coulomb per second. Volt is for potential difference, Ohm for resistance, Watt for power."
});
newQuestions.push({
  "section": "Science",
  "text": "Which vitamin is synthesized by the human body when exposed to sunlight?",
  "options": [
    { "label": "A", "text": "Vitamin A", "correct": false },
    { "label": "B", "text": "Vitamin B12", "correct": false },
    { "label": "C", "text": "Vitamin C", "correct": false },
    { "label": "D", "text": "Vitamin D", "correct": true }
  ],
  "solution": "Vitamin D (cholecalciferol) is synthesized in the skin upon exposure to UV-B radiation from sunlight. It is essential for calcium absorption and bone health."
});
newQuestions.push({
  "section": "Science",
  "text": "Which of the following elements is the most abundant in the Earth's crust?",
  "options": [
    { "label": "A", "text": "Silicon", "correct": false },
    { "label": "B", "text": "Aluminium", "correct": false },
    { "label": "C", "text": "Oxygen", "correct": true },
    { "label": "D", "text": "Iron", "correct": false }
  ],
  "solution": "Oxygen (46.6% by mass) is the most abundant element in the Earth's crust. Silicon (27.7%) is second, Aluminium (8.1%) is third."
});
newQuestions.push({
  "section": "Science",
  "text": "The pH of a neutral solution at 25°C is:",
  "options": [
    { "label": "A", "text": "0", "correct": false },
    { "label": "B", "text": "7", "correct": true },
    { "label": "C", "text": "10", "correct": false },
    { "label": "D", "text": "14", "correct": false }
  ],
  "solution": "pH of a neutral solution is 7 at 25°C. pH below 7 is acidic, above 7 is basic. Pure water has pH 7."
});
newQuestions.push({
  "section": "Science",
  "text": "Which of the following gases is responsible for the greenhouse effect?",
  "options": [
    { "label": "A", "text": "Nitrogen", "correct": false },
    { "label": "B", "text": "Oxygen", "correct": false },
    { "label": "C", "text": "Carbon dioxide", "correct": true },
    { "label": "D", "text": "Hydrogen", "correct": false }
  ],
  "solution": "Carbon dioxide (CO2) is the primary greenhouse gas, along with methane (CH4), nitrous oxide (N2O), and water vapor. They trap heat in the atmosphere."
});
newQuestions.push({
  "section": "Science",
  "text": "What is the chemical formula of common table salt?",
  "options": [
    { "label": "A", "text": "NaCl", "correct": true },
    { "label": "B", "text": "KCl", "correct": false },
    { "label": "C", "text": "Na2CO3", "correct": false },
    { "label": "D", "text": "CaCl2", "correct": false }
  ],
  "solution": "Common table salt is Sodium Chloride (NaCl). It is formed by the neutralization reaction between HCl (acid) and NaOH (base)."
});
newQuestions.push({
  "section": "Science",
  "text": "The human heart is located between which two lungs?",
  "options": [
    { "label": "A", "text": "Between the two lungs, slightly to the left", "correct": true },
    { "label": "B", "text": "Between the two lungs, slightly to the right", "correct": false },
    { "label": "C", "text": "Above the left lung", "correct": false },
    { "label": "D", "text": "Below the right lung", "correct": false }
  ],
  "solution": "The heart is positioned between the two lungs in the mediastinum, with about two-thirds of its mass to the left of the midline."
});
newQuestions.push({
  "section": "Science",
  "text": "Which of the following is NOT a vector quantity?",
  "options": [
    { "label": "A", "text": "Velocity", "correct": false },
    { "label": "B", "text": "Force", "correct": false },
    { "label": "C", "text": "Mass", "correct": true },
    { "label": "D", "text": "Acceleration", "correct": false }
  ],
  "solution": "Mass is a scalar quantity (has only magnitude). Velocity, force, and acceleration are vectors (have both magnitude and direction)."
});
newQuestions.push({
  "section": "Science",
  "text": "The atomic number of an element is determined by the number of:",
  "options": [
    { "label": "A", "text": "Neutrons", "correct": false },
    { "label": "B", "text": "Protons", "correct": true },
    { "label": "C", "text": "Electrons + Neutrons", "correct": false },
    { "label": "D", "text": "Nucleons", "correct": false }
  ],
  "solution": "Atomic number (Z) = number of protons in the nucleus. It uniquely identifies an element. Mass number (A) = protons + neutrons."
});
newQuestions.push({
  "section": "Science",
  "text": "Which hormone regulates blood sugar levels in the human body?",
  "options": [
    { "label": "A", "text": "Insulin", "correct": true },
    { "label": "B", "text": "Thyroxine", "correct": false },
    { "label": "C", "text": "Adrenaline", "correct": false },
    { "label": "D", "text": "Estrogen", "correct": false }
  ],
  "solution": "Insulin is produced by the beta cells of the pancreas and regulates blood glucose by promoting cellular uptake of glucose. Deficiency causes diabetes mellitus."
});
newQuestions.push({
  "section": "Science",
  "text": "The phenomenon of splitting of white light into its constituent colors is called:",
  "options": [
    { "label": "A", "text": "Reflection", "correct": false },
    { "label": "B", "text": "Refraction", "correct": false },
    { "label": "C", "text": "Diffraction", "correct": false },
    { "label": "D", "text": "Dispersion", "correct": true }
  ],
  "solution": "Dispersion is the splitting of white light into its constituent colors (VIBGYOR). It was first demonstrated by Isaac Newton using a prism."
});
newQuestions.push({
  "section": "Science",
  "text": "Which of the following is a vestigial organ in humans?",
  "options": [
    { "label": "A", "text": "Kidney", "correct": false },
    { "label": "B", "text": "Appendix", "correct": true },
    { "label": "C", "text": "Pancreas", "correct": false },
    { "label": "D", "text": "Liver", "correct": false }
  ],
  "solution": "The vermiform appendix is a vestigial organ in humans. It was once used for digesting cellulose but has lost its function through evolution."
});
newQuestions.push({
  "section": "Science",
  "text": "The chemical symbol 'Au' stands for which element?",
  "options": [
    { "label": "A", "text": "Silver", "correct": false },
    { "label": "B", "text": "Aluminium", "correct": false },
    { "label": "C", "text": "Gold", "correct": true },
    { "label": "D", "text": "Argon", "correct": false }
  ],
  "solution": "Au (from Latin 'Aurum') is the symbol for Gold. Ag = Silver (Argentum), Al = Aluminium, Ar = Argon."
});
newQuestions.push({
  "section": "Science",
  "text": "In a concave mirror, the image formed is virtual and erect when the object is placed:",
  "options": [
    { "label": "A", "text": "At the focus", "correct": false },
    { "label": "B", "text": "Beyond the center of curvature", "correct": false },
    { "label": "C", "text": "Between the pole and the focus", "correct": true },
    { "label": "D", "text": "At the center of curvature", "correct": false }
  ],
  "solution": "In a concave mirror, when the object is placed between the pole (P) and the focus (F), the image is virtual, erect, and magnified (like a shaving mirror)."
});
newQuestions.push({
  "section": "Science",
  "text": "Which of the following is a greenhouse gas with the highest global warming potential?",
  "options": [
    { "label": "A", "text": "Carbon dioxide", "correct": false },
    { "label": "B", "text": "Methane", "correct": false },
    { "label": "C", "text": "Sulphur hexafluoride", "correct": true },
    { "label": "D", "text": "Nitrous oxide", "correct": false }
  ],
  "solution": "Sulphur hexafluoride (SF6) has a global warming potential (GWP) of 23,500 times that of CO2 over 100 years, making it one of the most potent greenhouse gases."
});

// --- Reasoning (15 new) ---
newQuestions.push({
  "section": "Reasoning",
  "text": "If in a certain code, 'MANGO' is written as 'NZOHP', how is 'APPLE' written?",
  "options": [
    { "label": "A", "text": "BQQMF", "correct": true },
    { "label": "B", "text": "ZOKD", "correct": false },
    { "label": "C", "text": "BQQME", "correct": false },
    { "label": "D", "text": "BRRNG", "correct": false }
  ],
  "solution": "Each letter is shifted by +1 in the alphabet: M+1=N, A+1=Z (actually A+1=B, but wait - let's check. M->N (+1), A->Z (actually A->Z is -1, not +1). So the pattern is: M->N (+1), A->Z (-1), N->O (+1), G->H (+1), O->P (+1). So it alternates +1, -1, +1, +1, +1. Let me re-check. Actually MANGO: M(13)->N(14): +1, A(1)->Z(26): -1, N(14)->O(15): +1, G(7)->H(8): +1, O(15)->P(16): +1. APPLE: A+1=B, P-1=O, P+1=Q, L+1=M, E+1=F => BOQMF? Hmm, let me reconsider. The code NZOHP: N=14, original M=13; Z=26, original A=1; O=15, original N=14; H=8, original G=7; P=16, original O=15. Difference: +1, -1, +1, +1, +1. So for APPLE: A+1=B, P-1=O, P+1=Q, L+1=M, E+1=F => BOQMF. But option A is BQQMF. So it's actually: A+1=B, P+1=Q, P+1=Q, L+1=M, E+1=F => BQQMF. All letters shift by +1? No, MANGO -> NZOHP: M->N(+1), A->Z(-1 or +25), N->O(+1), G->H(+1), O->P(+1). So A->Z is not +1. Let me check NZOHP: N=14, M=13 (+1). Z=26, A=1 (that's +25 or -1). O=15, N=14 (+1). H=8, G=7 (+1). P=16, O=15 (+1). So vowels (A, E, I, O, U) get -1 (or +25), consonants get +1. MANGO: M(consonant)+1=N, A(vowel)-1=Z, N(consonant)+1=O, G(consonant)+1=H, O(vowel)-1=N. Wait O->P is +1 but O is a vowel. OK that breaks the rule. Let me re-check. M A N G O -> N Z O H P. M+1=N, A-1=Z, N+1=O, G+1=H, O+1=P. So only A got -1. Maybe A is treated specially? The pattern is: each letter is shifted by +1, and if the result would be A->B, A becomes Z instead (cyclic). Let me check: A+1=B, but in the code A becomes Z. So it's: each letter is replaced by the next letter in the alphabet, but if it's a vowel it becomes the PREVIOUS letter. Check: M(consonant)+1=N ✓, A(vowel)-1=Z ✓, N(consonant)+1=O ✓, G(consonant)+1=H ✓, O(vowel)-1=N? But O became P (+1) in the code. Hmm, O is a vowel but got +1. So the pattern is not vowels vs consonants. Let me look more simply: M A N G O -> N Z O H P. The differences: +1, -1, +1, +1, +1. It's not a consistent positional pattern. Let me look at alphabetical positions: M=13->14, A=1->26, N=14->15, G=7->8, O=15->16. The only one that wraps around is A (1->26). So the pattern is: shift forward by 1, but if it reaches A, wrap to Z. Wait A+1=Z doesn't make sense either. Maybe the pattern is simply: each letter is replaced by the letter that comes after it in the alphabet, and since A is the first letter, its next letter cyclically is Z. But A's next letter should be B. So it's not simple +1. 

Let me reconsider. Maybe the code is: each letter is moved forward by its position? No. M(13th letter), A(1st), N(14th), G(7th), O(15th).

Actually, I think the simplest pattern is: each letter is replaced by the next letter in the alphabet, except for vowels which are replaced by the previous letter. Let me verify: M(consonant)->N(+1) ✓. A(vowel)->Z(-1) ✓. N(consonant)->O(+1) ✓. G(consonant)->H(+1) ✓. O(vowel)->? According to this rule O should become N(-1), but in the code it becomes P(+1). So the rule doesn't hold for O.

OK I'm overcomplicating this. Let me just look at options A: BQQMF. APPLE -> BQQMF. A+1=B, P+1=Q, P+1=Q, L+1=M, E+1=F. That's +1 for all letters. But MANGO -> NZOHP doesn't match +1 for all (A->Z is -1).

Hmm wait, maybe I'm wrong about what option A is. Let me reconsider. Option A is "BQQMF". Option B is "ZOKD" (only 4 letters, wrong length). Option C is "BQQME". Option D is "BRRNG".

Actually looking at it again, if the code is just +1 for all letters: M+1=N, A+1=B (not Z), N+1=O, G+1=H, O+1=P. That gives NBOHP not NZOHP. So it's not consistent +1.

Let me try -1 for vowels, +1 for consonants: M+1=N ✓, A-1=Z ✓, N+1=O ✓, G+1=H ✓. O is a vowel so O-1=N. But the code has P, not N. So still doesn't work for O.

Maybe the pattern is simpler than I think. Let me just go with the most common type of coding question: +1 for consonant, -1 for vowel (which fails for O but O could be an exception). Or maybe it's just: next letter in alphabet, and for vowels go to previous instead. Since O->P (+1) but O is a vowel... 

You know what, I'm going to make this simpler by adjusting the question. Let me just change the question to use a clear, consistent pattern. The fact that I can't clearly figure out the pattern means this is a bad question. Let me make reasoning questions with clear patterns instead.

Actually, I'll redo this. The approach of adding questions manually in a script is getting unwieldy. Let me just write a simpler, cleaner set of questions and ensure the logic is correct.

Let me rewrite this whole approach. I'll create a cleaner script that's more manageable.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true">var fs = require('fs');
var path = require('path');

var BANK = path.join(__dirname, '..', 'question-bank', 'agniveer.json');
var data = JSON.parse(fs.readFileSync(BANK, 'utf-8'));

var questions = data.questions;

// ----- DEDUPLICATION (by exact text) -----
var seen = {};
var deduped = [];
questions.forEach(function(q){
  var key = q.text.trim().toLowerCase();
  if (seen[key]) return;
  seen[key] = true;
  deduped.push(q);
});

console.log('Before: ' + questions.length + ' questions');
console.log('Dupes removed: ' + (questions.length - deduped.length));
console.log('After dedup: ' + deduped.length + ' questions');

// ----- RE-ID -----
deduped.forEach(function(q, i){
  q.id = i + 1;
  q.q = i + 1;
});

// ----- NEW QUESTIONS -----
var newQs = [];

// GK (12 new)
newQs.push({section:"General Knowledge",text:"Which of the following is NOT a Fundamental Right under the Indian Constitution?",options:[{label:"A",text:"Right to Equality",correct:false},{label:"B",text:"Right to Freedom",correct:false},{label:"C",text:"Right to Property",correct:true},{label:"D",text:"Right to Constitutional Remedies",correct:false}],solution:"Right to Property (Article 31) was removed from Fundamental Rights by the 44th Amendment Act, 1978. It is now a legal right under Article 300A."});
newQs.push({section:"General Knowledge",text:"The 'Deep Ocean Mission' is under which ministry?",options:[{label:"A",text:"Ministry of Earth Sciences",correct:true},{label:"B",text:"Ministry of Defence",correct:false},{label:"C",text:"Ministry of Science and Technology",correct:false},{label:"D",text:"Ministry of Environment",correct:false}],solution:"Deep Ocean Mission is India's deep-sea exploration initiative under the Ministry of Earth Sciences (MoES)."});
newQs.push({section:"General Knowledge",text:"Tropic of Cancer passes through how many Indian states?",options:[{label:"A",text:"6",correct:false},{label:"B",text:"7",correct:false},{label:"C",text:"8",correct:true},{label:"D",text:"9",correct:false}],solution:"Tropic of Cancer (23.5°N) passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram."});
newQs.push({section:"General Knowledge",text:"Who was the last Governor-General of independent India?",options:[{label:"A",text:"Lord Mountbatten",correct:false},{label:"B",text:"C. Rajagopalachari",correct:true},{label:"C",text:"Dr. Rajendra Prasad",correct:false},{label:"D",text:"Lord Wavell",correct:false}],solution:"C. Rajagopalachari (CR) was the last Governor-General (1948-1950). Lord Mountbatten was the first."});
newQs.push({section:"General Knowledge",text:"LVM3 (formerly GSLV Mk III) is designed primarily for:",options:[{label:"A",text:"Polar satellite launches",correct:false},{label:"B",text:"Geostationary and crew-rated missions",correct:true},{label:"C",text:"Sub-orbital sounding rockets",correct:false},{label:"D",text:"Interplanetary missions only",correct:false}],solution:"LVM3 is designed for geostationary 4-ton class satellites and is ISRO's crew-rated launcher for Gaganyaan."});
newQs.push({section:"General Knowledge",text:"The 'Global Gender Gap Index' is published by:",options:[{label:"A",text:"World Bank",correct:false},{label:"B",text:"World Economic Forum",correct:true},{label:"C",text:"UNDP",correct:false},{label:"D",text:"UN Women",correct:false}],solution:"The Global Gender Gap Index is published annually by the World Economic Forum (WEF)."});
newQs.push({section:"General Knowledge",text:"As per the Constitution, power to create a new All India Service rests with:",options:[{label:"A",text:"The President",correct:false},{label:"B",text:"The Parliament",correct:true},{label:"C",text:"The Union Cabinet",correct:false},{label:"D",text:"The UPSC",correct:false}],solution:"Article 312 empowers Parliament to create new All India Services by a 2/3 majority in Rajya Sabha."});
newQs.push({section:"General Knowledge",text:"Which Indian military operation evicted Pakistani forces from Kargil in 1999?",options:[{label:"A",text:"Operation Vijay",correct:true},{label:"B",text:"Operation Parakram",correct:false},{label:"C",text:"Operation Meghdoot",correct:false},{label:"D",text:"Operation Safed Sagar",correct:false}],solution:"Operation Vijay (May-July 1999) cleared Pakistani infiltrators from Kargil sector."});
newQs.push({section:"General Knowledge",text:"Which pass connects the Kashmir Valley with Ladakh?",options:[{label:"A",text:"Khardung La",correct:false},{label:"B",text:"Zoji La",correct:true},{label:"C",text:"Nathu La",correct:false},{label:"D",text:"Shipki La",correct:false}],solution:"Zoji La connects Srinagar with Leh. Khardung La is near Leh, Nathu La is Sikkim-China border."});
newQs.push({section:"General Knowledge",text:"Which tribe is primarily associated with the Nilgiri Hills?",options:[{label:"A",text:"Santhal",correct:false},{label:"B",text:"Bhil",correct:false},{label:"C",text:"Toda",correct:true},{label:"D",text:"Gond",correct:false}],solution:"Toda tribe is native to Nilgiri Hills, Tamil Nadu. They are known for embroidered shawls and pastoral lifestyle."});
newQs.push({section:"General Knowledge",text:"India's GDP base year is currently:",options:[{label:"A",text:"2010-11",correct:false},{label:"B",text:"2011-12",correct:true},{label:"C",text:"2014-15",correct:false},{label:"D",text:"2016-17",correct:false}],solution:"Current base year for GDP is 2011-12, revised from 2004-05 in January 2015."});
newQs.push({section:"General Knowledge",text:"Which Indian state was formerly known as NEFA?",options:[{label:"A",text:"Nagaland",correct:false},{label:"B",text:"Arunachal Pradesh",correct:true},{label:"C",text:"Mizoram",correct:false},{label:"D",text:"Meghalaya",correct:false}],solution:"Arunachal Pradesh was formerly North-East Frontier Agency (NEFA), renamed in 1972, became state in 1987."});

// Maths (15 new)
newQs.push({section:"Mathematics",text:"A shopkeeper marks an item 40% above CP and gives 25% discount. Profit %?",options:[{label:"A",text:"5% profit",correct:true},{label:"B",text:"10% profit",correct:false},{label:"C",text:"5% loss",correct:false},{label:"D",text:"No profit no loss",correct:false}],solution:"Let CP=100. MP=140. Discount=25% of 140=35. SP=105. Profit=5%."});
newQs.push({section:"Mathematics",text:"A and B together complete work in 12 days. B alone in 30 days. A alone?",options:[{label:"A",text:"15 days",correct:false},{label:"B",text:"18 days",correct:false},{label:"C",text:"20 days",correct:true},{label:"D",text:"24 days",correct:false}],solution:"A+B=1/12, B=1/30. A=1/12-1/30=3/60=1/20. A alone takes 20 days."});
newQs.push({section:"Mathematics",text:"A 300 m train passes a 200 m platform in 25 s. Speed in km/h?",options:[{label:"A",text:"54 km/h",correct:false},{label:"B",text:"60 km/h",correct:false},{label:"C",text:"72 km/h",correct:true},{label:"D",text:"80 km/h",correct:false}],solution:"Total distance=500 m. Speed=500/25=20 m/s = 20×18/5=72 km/h."});
newQs.push({section:"Mathematics",text:"If 15% of a number is 45, 25% of that number is:",options:[{label:"A",text:"60",correct:false},{label:"B",text:"75",correct:true},{label:"C",text:"80",correct:false},{label:"D",text:"90",correct:false}],solution:"x=45×100/15=300. 25% of 300=75."});
newQs.push({section:"Mathematics",text:"SI on Rs.6000 at 8% for 3 years:",options:[{label:"A",text:"Rs.1200",correct:false},{label:"B",text:"Rs.1360",correct:false},{label:"C",text:"Rs.1440",correct:true},{label:"D",text:"Rs.1500",correct:false}],solution:"SI = 6000×8×3/100 = Rs.1440."});
newQs.push({section:"Mathematics",text:"A man travels half distance at 40 km/h and half at 60 km/h in 8 h. Total distance?",options:[{label:"A",text:"360 km",correct:false},{label:"B",text:"384 km",correct:true},{label:"C",text:"400 km",correct:false},{label:"D",text:"420 km",correct:false}],solution:"Let total=2x. x/40+x/60=8 => 5x/120=8 => x=192. Total=384 km."});
newQs.push({section:"Mathematics",text:"Two numbers are in ratio 4:7. Sum=121. Difference?",options:[{label:"A",text:"27",correct:false},{label:"B",text:"30",correct:false},{label:"C",text:"33",correct:true},{label:"D",text:"36",correct:false}],solution:"4x+7x=11x=121 => x=11. Numbers:44,77. Difference=33."});
newQs.push({section:"Mathematics",text:"LCM=240, HCF=12. One number=60. Other number?",options:[{label:"A",text:"36",correct:false},{label:"B",text:"48",correct:true},{label:"C",text:"72",correct:false},{label:"D",text:"96",correct:false}],solution:"Product = LCM×HCF. Other = 240×12/60 = 48."});
newQs.push({section:"Mathematics",text:"A and B work together 3 days then A leaves. A takes 10 days, B 15 days alone. B finishes in:",options:[{label:"A",text:"6 days",correct:false},{label:"B",text:"7.5 days",correct:true},{label:"C",text:"8 days",correct:false},{label:"D",text:"9 days",correct:false}],solution:"A+B=1/6. In 3 days=1/2 done. Remaining=1/2. B alone=1/15. Time=7.5 days."});
newQs.push({section:"Mathematics",text:"Perimeter of rectangle=80 m, length is 4 m more than breadth. Area?",options:[{label:"A",text:"384 sq m",correct:false},{label:"B",text:"396 sq m",correct:true},{label:"C",text:"400 sq m",correct:false},{label:"D",text:"420 sq m",correct:false}],solution:"2(x+x+4)=80 => x=18. Area=22×18=396 sq m."});
newQs.push({section:"Mathematics",text:"3 coins tossed. Probability of exactly 2 heads?",options:[{label:"A",text:"1/8",correct:false},{label:"B",text:"3/8",correct:true},{label:"C",text:"1/2",correct:false},{label:"D",text:"5/8",correct:false}],solution:"Total=8. Favorable (HHT,HTH,THH)=3. P=3/8."});
newQs.push({section:"Mathematics",text:"Average of 5 numbers is 18. Remove one, average becomes 16. Removed number?",options:[{label:"A",text:"20",correct:false},{label:"B",text:"22",correct:false},{label:"C",text:"24",correct:false},{label:"D",text:"26",correct:true}],solution:"Sum of 5=90. Sum of 4=64. Removed=90-64=26."});
newQs.push({section:"Mathematics",text:"If x + 1/x = 3, then x^2 + 1/x^2 = ?",options:[{label:"A",text:"5",correct:false},{label:"B",text:"7",correct:true},{label:"C",text:"9",correct:false},{label:"D",text:"11",correct:false}],solution:"(x+1/x)^2 = x^2+1/x^2+2 => 9 = x^2+1/x^2+2 => x^2+1/x^2=7."});
newQs.push({section:"Mathematics",text:"Sold at 10% loss. If sold for Rs.45 more, 5% profit. CP?",options:[{label:"A",text:"Rs.250",correct:false},{label:"B",text:"Rs.300",correct:true},{label:"C",text:"Rs.350",correct:false},{label:"D",text:"Rs.400",correct:false}],solution:"1.05x - 0.9x = 0.15x = 45 => x=300."});
newQs.push({section:"Mathematics",text:"A sum doubles itself in 5 years at simple interest. Rate %?",options:[{label:"A",text:"10%",correct:false},{label:"B",text:"15%",correct:false},{label:"C",text:"20%",correct:true},{label:"D",text:"25%",correct:false}],solution:"SI = P. So P = P×R×5/100 => R = 20%."});

// Science (14 new)
newQs.push({section:"Science",text:"SI unit of electric current?",options:[{label:"A",text:"Volt",correct:false},{label:"B",text:"Ampere",correct:true},{label:"C",text:"Ohm",correct:false},{label:"D",text:"Watt",correct:false}],solution:"SI unit of electric current is Ampere (A). Volt is potential, Ohm is resistance, Watt is power."});
newQs.push({section:"Science",text:"Which vitamin is synthesized in skin on sunlight exposure?",options:[{label:"A",text:"Vitamin A",correct:false},{label:"B",text:"Vitamin B12",correct:false},{label:"C",text:"Vitamin C",correct:false},{label:"D",text:"Vitamin D",correct:true}],solution:"Vitamin D (cholecalciferol) is synthesized in skin upon UV-B exposure from sunlight."});
newQs.push({section:"Science",text:"Most abundant element in Earth's crust?",options:[{label:"A",text:"Silicon",correct:false},{label:"B",text:"Aluminium",correct:false},{label:"C",text:"Oxygen",correct:true},{label:"D",text:"Iron",correct:false}],solution:"Oxygen (46.6%) is most abundant. Silicon (27.7%) second, Aluminium (8.1%) third."});
newQs.push({section:"Science",text:"pH of a neutral solution at 25°C:",options:[{label:"A",text:"0",correct:false},{label:"B",text:"7",correct:true},{label:"C",text:"10",correct:false},{label:"D",text:"14",correct:false}],solution:"Neutral solution has pH 7 at 25°C. Below 7 is acidic, above 7 is basic."});
newQs.push({section:"Science",text:"Chemical formula of common table salt:",options:[{label:"A",text:"NaCl",correct:true},{label:"B",text:"KCl",correct:false},{label:"C",text:"Na2CO3",correct:false},{label:"D",text:"CaCl2",correct:false}],solution:"Table salt is Sodium Chloride (NaCl), formed by neutralization of HCl and NaOH."});
newQs.push({section:"Science",text:"Human heart is located:",options:[{label:"A",text:"Between the lungs, slightly to the left",correct:true},{label:"B",text:"Between the lungs, slightly to the right",correct:false},{label:"C",text:"Above the left lung",correct:false},{label:"D",text:"Below the right lung",correct:false}],solution:"Heart is in mediastinum between lungs, 2/3 to the left of midline."});
newQs.push({section:"Science",text:"Which is NOT a vector quantity?",options:[{label:"A",text:"Velocity",correct:false},{label:"B",text:"Force",correct:false},{label:"C",text:"Mass",correct:true},{label:"D",text:"Acceleration",correct:false}],solution:"Mass is scalar (magnitude only). Velocity, force, acceleration are vectors (magnitude+direction)."});
newQs.push({section:"Science",text:"Atomic number is the number of:",options:[{label:"A",text:"Neutrons",correct:false},{label:"B",text:"Protons",correct:true},{label:"C",text:"Electrons+Neutrons",correct:false},{label:"D",text:"Nucleons",correct:false}],solution:"Atomic number = number of protons. Mass number = protons+neutrons."});
newQs.push({section:"Science",text:"Which hormone regulates blood sugar?",options:[{label:"A",text:"Insulin",correct:true},{label:"B",text:"Thyroxine",correct:false},{label:"C",text:"Adrenaline",correct:false},{label:"D",text:"Estrogen",correct:false}],solution:"Insulin from pancreatic beta cells regulates blood glucose. Deficiency causes diabetes."});
newQs.push({section:"Science",text:"Splitting of white light into colors is called:",options:[{label:"A",text:"Reflection",correct:false},{label:"B",text:"Refraction",correct:false},{label:"C",text:"Diffraction",correct:false},{label:"D",text:"Dispersion",correct:true}],solution:"Dispersion splits white light into VIBGYOR. Discovered by Newton using a prism."});
newQs.push({section:"Science",text:"Which is a vestigial organ in humans?",options:[{label:"A",text:"Kidney",correct:false},{label:"B",text:"Appendix",correct:true},{label:"C",text:"Pancreas",correct:false},{label:"D",text:"Liver",correct:false}],solution:"Vermiform appendix is vestigial. It once aided cellulose digestion but no longer serves a function."});
newQs.push({section:"Science",text:"Chemical symbol 'Au' stands for:",options:[{label:"A",text:"Silver",correct:false},{label:"B",text:"Aluminium",correct:false},{label:"C",text:"Gold",correct:true},{label:"D",text:"Argon",correct:false}],solution:"Au (Latin 'Aurum') = Gold. Ag = Silver, Al = Aluminium, Ar = Argon."});
newQs.push({section:"Science",text:"In a concave mirror, virtual/erect image is formed when object is placed:",options:[{label:"A",text:"At the focus",correct:false},{label:"B",text:"Beyond C",correct:false},{label:"C",text:"Between pole and focus",correct:true},{label:"D",text:"At C",correct:false}],solution:"When object is between P and F of concave mirror, image is virtual, erect and magnified."});
newQs.push({section:"Science",text:"Which gas has the highest global warming potential?",options:[{label:"A",text:"CO2",correct:false},{label:"B",text:"Methane",correct:false},{label:"C",text:"Sulphur hexafluoride",correct:true},{label:"D",text:"Nitrous oxide",correct:false}],solution:"SF6 has GWP of 23,500 times CO2, making it one of the most potent greenhouse gases."});

// Reasoning (14 new)
newQs.push({section:"Reasoning",text:"Find the missing number: 2, 6, 12, 20, 30, ?",options:[{label:"A",text:"36",correct:false},{label:"B",text:"40",correct:false},{label:"C",text:"42",correct:true},{label:"D",text:"48",correct:false}],solution:"Pattern: 1×2, 2×3, 3×4, 4×5, 5×6 = 30, next 6×7 = 42. Or difference: +4,+6,+8,+10,+12 => 42."});
newQs.push({section:"Reasoning",text:"In a code, 'DELHI' → 'EDKJL'. How is 'MUMBAI' coded?",options:[{label:"A",text:"NVNCAJ",correct:false},{label:"B",text:"NVODBJ",correct:false},{label:"C",text:"NVNCBJ",correct:true},{label:"D",text:"OVNCBK",correct:false}],solution:"DELHI: D+1=E, E-1=D, L+1=M, H+1=I, I+1=J => EDKIJ? Actually DELHI: D+1=E, E+1=F, L+1=M, H+1=I, I+1=J => EFMIJ. But code is EDKJL. So: D+1=E, E-1=D, L+1=M, H+1=I, I+1=J => EDM IJ? Hmm. Let me re-check: Given code EDKJL for DELHI. D→E (+1), E→D (-1), L→K (-1), H→I (+1), I→J (+1). Pattern: +1,-1,-1,+1,+1. For MUMBAI: M+1=N, U-1=T, M-1=L, B+1=C, A+1=B, I+1=J => NTLCBJ. Hmm not matching. Or maybe: each consonant +1, each vowel -1. D(consonant)+1=E, E(vowel)-1=D, L(consonant)+1=M? But L becomes K (-1) in code. So not that. Pattern: +1,-1,-1,+1,+1. This doesn't give clean answer. Let me simplify: each letter shifted by +1, except vowels become previous letter. D(consonant)+1=E ✓, E(vowel)-1=D ✓, L(consonant)+1=M ✗ (code has K), H(consonant)+1=I ✓, I(vowel)-1=H ✗ (code has J). 

OK let me try a simpler approach. Consecutive letters alternate between +1 and -1: D+1=E, E-1=D, L+1=M, H-1=G, I+1=J => EDMGJ. Not matching.

Let me try: +1,-1,-1,+1,+1 for DELHI. For MUMBAI (6 letters): +1,-1,-1,+1,+1,? Maybe repeat? M+1=N, U-1=T, M-1=L, B+1=C, A+1=B, I-1=H => NTLCBH. Not matching options.

Ok these reasoning questions are tricky to get right without testing. Let me make simpler, clearly correct ones.

Actually, the simplest approach: I should write a script to test the logic works before committing. But that's over-engineering this. Let me just make questions with very clear, standard patterns that I can verify:
- Coding: simple letter shift patterns
- Number series: straightforward arithmetic/geometric
- Analogy: directly comparable
- Blood relation: simple family trees

Let me simplify the reasoning questions.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true">var fs = require('fs');
var path = require('path');

var BANK = path.join(__dirname, '..', 'question-bank', 'agniveer.json');
var data = JSON.parse(fs.readFileSync(BANK, 'utf-8'));

var questions = data.questions;

// ----- DEDUPLICATION (by exact text) -----
var seen = {};
var deduped = [];
questions.forEach(function(q){
  var key = q.text.trim().toLowerCase();
  if (seen[key]) return;
  seen[key] = true;
  deduped.push(q);
});

console.log('Before: ' + questions.length + ' questions');
console.log('Dupes removed: ' + (questions.length - deduped.length));
console.log('After dedup: ' + deduped.length + ' questions');

// ----- RE-ID -----
deduped.forEach(function(q, i){
  q.id = i + 1;
  q.q = i + 1;
});

// ----- NEW QUESTIONS -----
var newQs = [];

// GK (12 new)
newQs.push({section:"General Knowledge",text:"Which of the following is NOT a Fundamental Right under the Indian Constitution?",options:[{label:"A",text:"Right to Equality",correct:false},{label:"B",text:"Right to Freedom",correct:false},{label:"C",text:"Right to Property",correct:true},{label:"D",text:"Right to Constitutional Remedies",correct:false}],solution:"Right to Property (Article 31) was removed from Fundamental Rights by the 44th Amendment Act, 1978. It is now a legal right under Article 300A."});
newQs.push({section:"General Knowledge",text:"The 'Deep Ocean Mission' is under which ministry?",options:[{label:"A",text:"Ministry of Earth Sciences",correct:true},{label:"B",text:"Ministry of Defence",correct:false},{label:"C",text:"Ministry of Science and Technology",correct:false},{label:"D",text:"Ministry of Environment",correct:false}],solution:"Deep Ocean Mission is India's deep-sea exploration initiative under the Ministry of Earth Sciences (MoES)."});
newQs.push({section:"General Knowledge",text:"Tropic of Cancer passes through how many Indian states?",options:[{label:"A",text:"6",correct:false},{label:"B",text:"7",correct:false},{label:"C",text:"8",correct:true},{label:"D",text:"9",correct:false}],solution:"Tropic of Cancer (23.5°N) passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram."});
newQs.push({section:"General Knowledge",text:"Who was the last Governor-General of independent India?",options:[{label:"A",text:"Lord Mountbatten",correct:false},{label:"B",text:"C. Rajagopalachari",correct:true},{label:"C",text:"Dr. Rajendra Prasad",correct:false},{label:"D",text:"Lord Wavell",correct:false}],solution:"C. Rajagopalachari (CR) was the last Governor-General (1948-1950). Lord Mountbatten was the first."});
newQs.push({section:"General Knowledge",text:"LVM3 (formerly GSLV Mk III) is designed primarily for:",options:[{label:"A",text:"Polar satellite launches",correct:false},{label:"B",text:"Geostationary and crew-rated missions",correct:true},{label:"C",text:"Sub-orbital sounding rockets",correct:false},{label:"D",text:"Interplanetary missions only",correct:false}],solution:"LVM3 is designed for geostationary 4-ton class satellites and is ISRO's crew-rated launcher for Gaganyaan."});
newQs.push({section:"General Knowledge",text:"The 'Global Gender Gap Index' is published by:",options:[{label:"A",text:"World Bank",correct:false},{label:"B",text:"World Economic Forum",correct:true},{label:"C",text:"UNDP",correct:false},{label:"D",text:"UN Women",correct:false}],solution:"The Global Gender Gap Index is published annually by the World Economic Forum (WEF)."});
newQs.push({section:"General Knowledge",text:"As per the Constitution, power to create a new All India Service rests with:",options:[{label:"A",text:"The President",correct:false},{label:"B",text:"The Parliament",correct:true},{label:"C",text:"The Union Cabinet",correct:false},{label:"D",text:"The UPSC",correct:false}],solution:"Article 312 empowers Parliament to create new All India Services by a 2/3 majority in Rajya Sabha."});
newQs.push({section:"General Knowledge",text:"Which Indian military operation evicted Pakistani forces from Kargil in 1999?",options:[{label:"A",text:"Operation Vijay",correct:true},{label:"B",text:"Operation Parakram",correct:false},{label:"C",text:"Operation Meghdoot",correct:false},{label:"D",text:"Operation Safed Sagar",correct:false}],solution:"Operation Vijay (May-July 1999) cleared Pakistani infiltrators from Kargil sector."});
newQs.push({section:"General Knowledge",text:"Which pass connects the Kashmir Valley with Ladakh?",options:[{label:"A",text:"Khardung La",correct:false},{label:"B",text:"Zoji La",correct:true},{label:"C",text:"Nathu La",correct:false},{label:"D",text:"Shipki La",correct:false}],solution:"Zoji La connects Srinagar with Leh. Khardung La is near Leh, Nathu La is Sikkim-China border."});
newQs.push({section:"General Knowledge",text:"Which tribe is primarily associated with the Nilgiri Hills?",options:[{label:"A",text:"Santhal",correct:false},{label:"B",text:"Bhil",correct:false},{label:"C",text:"Toda",correct:true},{label:"D",text:"Gond",correct:false}],solution:"Toda tribe is native to Nilgiri Hills, Tamil Nadu. They are known for embroidered shawls and pastoral lifestyle."});
newQs.push({section:"General Knowledge",text:"India's GDP base year is currently:",options:[{label:"A",text:"2010-11",correct:false},{label:"B",text:"2011-12",correct:true},{label:"C",text:"2014-15",correct:false},{label:"D",text:"2016-17",correct:false}],solution:"Current base year for GDP is 2011-12, revised from 2004-05 in January 2015."});
newQs.push({section:"General Knowledge",text:"Which Indian state was formerly known as NEFA?",options:[{label:"A",text:"Nagaland",correct:false},{label:"B",text:"Arunachal Pradesh",correct:true},{label:"C",text:"Mizoram",correct:false},{label:"D",text:"Meghalaya",correct:false}],solution:"Arunachal Pradesh was formerly North-East Frontier Agency (NEFA), renamed in 1972, became state in 1987."});

// Maths (15 new)
newQs.push({section:"Mathematics",text:"A shopkeeper marks an item 40% above CP and gives 25% discount. Profit %?",options:[{label:"A",text:"5% profit",correct:true},{label:"B",text:"10% profit",correct:false},{label:"C",text:"5% loss",correct:false},{label:"D",text:"No profit no loss",correct:false}],solution:"Let CP=100. MP=140. Discount=25% of 140=35. SP=105. Profit=5%."});
newQs.push({section:"Mathematics",text:"A and B together complete work in 12 days. B alone in 30 days. A alone?",options:[{label:"A",text:"15 days",correct:false},{label:"B",text:"18 days",correct:false},{label:"C",text:"20 days",correct:true},{label:"D",text:"24 days",correct:false}],solution:"A+B=1/12, B=1/30. A=1/12-1/30=3/60=1/20. A alone takes 20 days."});
newQs.push({section:"Mathematics",text:"A 300 m train passes a 200 m platform in 25 s. Speed in km/h?",options:[{label:"A",text:"54 km/h",correct:false},{label:"B",text:"60 km/h",correct:false},{label:"C",text:"72 km/h",correct:true},{label:"D",text:"80 km/h",correct:false}],solution:"Total distance=500 m. Speed=500/25=20 m/s = 20×18/5=72 km/h."});
newQs.push({section:"Mathematics",text:"If 15% of a number is 45, 25% of that number is:",options:[{label:"A",text:"60",correct:false},{label:"B",text:"75",correct:true},{label:"C",text:"80",correct:false},{label:"D",text:"90",correct:false}],solution:"x=45×100/15=300. 25% of 300=75."});
newQs.push({section:"Mathematics",text:"SI on Rs.6000 at 8% for 3 years:",options:[{label:"A",text:"Rs.1200",correct:false},{label:"B",text:"Rs.1360",correct:false},{label:"C",text:"Rs.1440",correct:true},{label:"D",text:"Rs.1500",correct:false}],solution:"SI = 6000×8×3/100 = Rs.1440."});
newQs.push({section:"Mathematics",text:"A man travels half distance at 40 km/h and half at 60 km/h in 8 h. Total distance?",options:[{label:"A",text:"360 km",correct:false},{label:"B",text:"384 km",correct:true},{label:"C",text:"400 km",correct:false},{label:"D",text:"420 km",correct:false}],solution:"Let total=2x. x/40+x/60=8 => 5x/120=8 => x=192. Total=384 km."});
newQs.push({section:"Mathematics",text:"Two numbers are in ratio 4:7. Sum=121. Difference?",options:[{label:"A",text:"27",correct:false},{label:"B",text:"30",correct:false},{label:"C",text:"33",correct:true},{label:"D",text:"36",correct:false}],solution:"4x+7x=11x=121 => x=11. Numbers:44,77. Difference=33."});
newQs.push({section:"Mathematics",text:"LCM=240, HCF=12. One number=60. Other number?",options:[{label:"A",text:"36",correct:false},{label:"B",text:"48",correct:true},{label:"C",text:"72",correct:false},{label:"D",text:"96",correct:false}],solution:"Product = LCM×HCF. Other = 240×12/60 = 48."});
newQs.push({section:"Mathematics",text:"A and B work together 3 days then A leaves. A takes 10 days, B 15 days alone. B finishes in:",options:[{label:"A",text:"6 days",correct:false},{label:"B",text:"7.5 days",correct:true},{label:"C",text:"8 days",correct:false},{label:"D",text:"9 days",correct:false}],solution:"A+B=1/6. In 3 days=1/2 done. Remaining=1/2. B alone=1/15. Time=7.5 days."});
newQs.push({section:"Mathematics",text:"Perimeter of rectangle=80 m, length is 4 m more than breadth. Area?",options:[{label:"A",text:"384 sq m",correct:false},{label:"B",text:"396 sq m",correct:true},{label:"C",text:"400 sq m",correct:false},{label:"D",text:"420 sq m",correct:false}],solution:"2(x+x+4)=80 => x=18. Area=22×18=396 sq m."});
newQs.push({section:"Mathematics",text:"3 coins tossed. Probability of exactly 2 heads?",options:[{label:"A",text:"1/8",correct:false},{label:"B",text:"3/8",correct:true},{label:"C",text:"1/2",correct:false},{label:"D",text:"5/8",correct:false}],solution:"Total=8. Favorable (HHT,HTH,THH)=3. P=3/8."});
newQs.push({section:"Mathematics",text:"Average of 5 numbers is 18. Remove one, average becomes 16. Removed number?",options:[{label:"A",text:"20",correct:false},{label:"B",text:"22",correct:false},{label:"C",text:"24",correct:false},{label:"D",text:"26",correct:true}],solution:"Sum of 5=90. Sum of 4=64. Removed=90-64=26."});
newQs.push({section:"Mathematics",text:"If x + 1/x = 3, then x^2 + 1/x^2 = ?",options:[{label:"A",text:"5",correct:false},{label:"B",text:"7",correct:true},{label:"C",text:"9",correct:false},{label:"D",text:"11",correct:false}],solution:"(x+1/x)^2 = x^2+1/x^2+2 => 9 = x^2+1/x^2+2 => x^2+1/x^2=7."});
newQs.push({section:"Mathematics",text:"Sold at 10% loss. If sold for Rs.45 more, 5% profit. CP?",options:[{label:"A",text:"Rs.250",correct:false},{label:"B",text:"Rs.300",correct:true},{label:"C",text:"Rs.350",correct:false},{label:"D",text:"Rs.400",correct:false}],solution:"1.05x - 0.9x = 0.15x = 45 => x=300."});
newQs.push({section:"Mathematics",text:"A sum doubles itself in 5 years at simple interest. Rate %?",options:[{label:"A",text:"10%",correct:false},{label:"B",text:"15%",correct:false},{label:"C",text:"20%",correct:true},{label:"D",text:"25%",correct:false}],solution:"SI = P. So P = P×R×5/100 => R = 20%."});

// Science (14 new)
newQs.push({section:"Science",text:"SI unit of electric current?",options:[{label:"A",text:"Volt",correct:false},{label:"B",text:"Ampere",correct:true},{label:"C",text:"Ohm",correct:false},{label:"D",text:"Watt",correct:false}],solution:"SI unit of electric current is Ampere (A). Volt is potential, Ohm is resistance, Watt is power."});
newQs.push({section:"Science",text:"Which vitamin is synthesized in skin on sunlight exposure?",options:[{label:"A",text:"Vitamin A",correct:false},{label:"B",text:"Vitamin B12",correct:false},{label:"C",text:"Vitamin C",correct:false},{label:"D",text:"Vitamin D",correct:true}],solution:"Vitamin D (cholecalciferol) is synthesized in skin upon UV-B exposure from sunlight."});
newQs.push({section:"Science",text:"Most abundant element in Earth's crust?",options:[{label:"A",text:"Silicon",correct:false},{label:"B",text:"Aluminium",correct:false},{label:"C",text:"Oxygen",correct:true},{label:"D",text:"Iron",correct:false}],solution:"Oxygen (46.6%) is most abundant. Silicon (27.7%) second, Aluminium (8.1%) third."});
newQs.push({section:"Science",text:"pH of a neutral solution at 25°C:",options:[{label:"A",text:"0",correct:false},{label:"B",text:"7",correct:true},{label:"C",text:"10",correct:false},{label:"D",text:"14",correct:false}],solution:"Neutral solution has pH 7 at 25°C. Below 7 is acidic, above 7 is basic."});
newQs.push({section:"Science",text:"Chemical formula of common table salt:",options:[{label:"A",text:"NaCl",correct:true},{label:"B",text:"KCl",correct:false},{label:"C",text:"Na2CO3",correct:false},{label:"D",text:"CaCl2",correct:false}],solution:"Table salt is Sodium Chloride (NaCl), formed by neutralization of HCl and NaOH."});
newQs.push({section:"Science",text:"Human heart is located:",options:[{label:"A",text:"Between the lungs, slightly to the left",correct:true},{label:"B",text:"Between the lungs, slightly to the right",correct:false},{label:"C",text:"Above the left lung",correct:false},{label:"D",text:"Below the right lung",correct:false}],solution:"Heart is in mediastinum between lungs, 2/3 to the left of midline."});
newQs.push({section:"Science",text:"Which is NOT a vector quantity?",options:[{label:"A",text:"Velocity",correct:false},{label:"B",text:"Force",correct:false},{label:"C",text:"Mass",correct:true},{label:"D",text:"Acceleration",correct:false}],solution:"Mass is scalar (magnitude only). Velocity, force, acceleration are vectors (magnitude+direction)."});
newQs.push({section:"Science",text:"Atomic number is the number of:",options:[{label:"A",text:"Neutrons",correct:false},{label:"B",text:"Protons",correct:true},{label:"C",text:"Electrons+Neutrons",correct:false},{label:"D",text:"Nucleons",correct:false}],solution:"Atomic number = number of protons. Mass number = protons+neutrons."});
newQs.push({section:"Science",text:"Which hormone regulates blood sugar?",options:[{label:"A",text:"Insulin",correct:true},{label:"B",text:"Thyroxine",correct:false},{label:"C",text:"Adrenaline",correct:false},{label:"D",text:"Estrogen",correct:false}],solution:"Insulin from pancreatic beta cells regulates blood glucose. Deficiency causes diabetes."});
newQs.push({section:"Science",text:"Splitting of white light into colors is called:",options:[{label:"A",text:"Reflection",correct:false},{label:"B",text:"Refraction",correct:false},{label:"C",text:"Diffraction",correct:false},{label:"D",text:"Dispersion",correct:true}],solution:"Dispersion splits white light into VIBGYOR. Discovered by Newton using a prism."});
newQs.push({section:"Science",text:"Which is a vestigial organ in humans?",options:[{label:"A",text:"Kidney",correct:false},{label:"B",text:"Appendix",correct:true},{label:"C",text:"Pancreas",correct:false},{label:"D",text:"Liver",correct:false}],solution:"Vermiform appendix is vestigial. It once aided cellulose digestion but no longer serves a function."});
newQs.push({section:"Science",text:"Chemical symbol 'Au' stands for:",options:[{label:"A",text:"Silver",correct:false},{label:"B",text:"Aluminium",correct:false},{label:"C",text:"Gold",correct:true},{label:"D",text:"Argon",correct:false}],solution:"Au (Latin 'Aurum') = Gold. Ag = Silver, Al = Aluminium, Ar = Argon."});
newQs.push({section:"Science",text:"In a concave mirror, virtual/erect image is formed when object is placed:",options:[{label:"A",text:"At the focus",correct:false},{label:"B",text:"Beyond C",correct:false},{label:"C",text:"Between pole and focus",correct:true},{label:"D",text:"At C",correct:false}],solution:"When object is between P and F of concave mirror, image is virtual, erect and magnified."});
newQs.push({section:"Science",text:"Which gas has the highest global warming potential?",options:[{label:"A",text:"CO2",correct:false},{label:"B",text:"Methane",correct:false},{label:"C",text:"Sulphur hexafluoride",correct:true},{label:"D",text:"Nitrous oxide",correct:false}],solution:"SF6 has GWP of 23,500 times CO2, making it one of the most potent greenhouse gases."});

// Reasoning (14 new)
newQs.push({section:"Reasoning",text:"Find the missing number: 2, 6, 12, 20, 30, ?",options:[{label:"A",text:"36",correct:false},{label:"B",text:"40",correct:false},{label:"C",text:"42",correct:true},{label:"D",text:"48",correct:false}],solution:"Pattern: 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42. Differences: +4,+6,+8,+10,+12 => 42."});
newQs.push({section:"Reasoning",text:"In a certain code, 'APPLE' is written as 'BQQMF'. How is 'MANGO' written?",options:[{label:"A",text:"NZOHP",correct:false},{label:"B",text:"NBNHP",correct:false},{label:"C",text:"NZOHQ",correct:false},{label:"D",text:"NZPHP",correct:false}],solution:"Wait - if APPLE→BQQMF, then each letter is shifted by +1: A+1=B, P+1=Q, P+1=Q, L+1=M, E+1=F. So MANGO: M+1=N, A+1=B, N+1=O, G+1=H, O+1=P => NBOHP. None match. Let me re-check. APPLE→BQQMF: A→B(+1), P→Q(+1), P→Q(+1), L→M(+1), E→F(+1). That's simple +1. So MANGO: M(13)→N(14), A(1)→B(2), N(14)→O(15), G(7)→H(8), O(15)→P(16) => NBOHP. Option A is NZOHP (M+1=N ✓, A-1=Z ✗, N+1=O ✓, G+1=H ✓, O+1=P ✓). So A gives: N Z O H P. M A N G O: M+1=N ✓, A... A→Z is -1 (or +25). So the code is NOT simple +1. Each consonant +1, each vowel -1: M(consonant)+1=N ✓, A(vowel)-1=Z ✓, N(consonant)+1=O ✓, G(consonant)+1=H ✓, O(vowel)-1=N. But the code shows O→P, which is +1. Hmm. Let me re-verify with APPLE: A(vowel)-1=Z, P(consonant)+1=Q, P+1=Q, L+1=M, E(vowel)-1=D => ZQQMD. But code is BQQMF. So the pattern is not vowel-consonant based. Simpler: APPLE→BQQMF is all +1. Then MANGO: M+1=N, A+1=B, N+1=O, G+1=H, O+1=P => NBOHP. Since no option matches NBOHP, let me check if options have NBOHP... Looking at A: NZOHP, B: NBNHP, C: NZOHQ, D: NZPHP. None match NBOHP. This means my question has a wrong answer set!"});
newQs.push({section:"Reasoning",text:"If 'PENCIL' is coded as 'QDOBHK', how is 'PAPER' coded?",options:[{label:"A",text:"QBOFS",correct:false},{label:"B",text:"QZODS",correct:false},{label:"C",text:"QZOFQ",correct:false},{label:"D",text:"QZOFQ",correct:false}],solution:"P+1=Q, E+1=F, N-1=M, C-1=B, I-1=H, L+1=K => QFM BHK? That doesn't match QDOBHK. Let me re-check. P→Q(+1), E→D(-1), N→O(+1), C→B(-1), I→H(-1), L→K(-1). Pattern: +1,-1,+1,-1,-1,-1. Not clear. Or: P+1=Q, E-1=D, N+1=O, C-1=B, I-1=H, L-1=K. So the pattern is +1,-1,+1,-1,-1,-1. PAPER: P+1=Q, A-1=Z, P+1=Q, E-1=D, R-1=Q => QZQDQ. Not matching options. Hmm."});
newQs.push({section:"Reasoning",text:"A man walks 10 km south, then 6 km east, then 3 km north. How far is he from start?",options:[{label:"A",text:"5 km",correct:false},{label:"B",text:"7 km",correct:false},{label:"C",text:"8 km",correct:false},{label:"D",text:"10 km",correct:false}],solution:"Net south displacement = 10-3=7 km south. East displacement=6 km. Distance = sqrt(7^2+6^2) = sqrt(49+36) = sqrt(85) ≈ 9.2 km. None of the options match exactly 9.2 km. This is wrong too!"});
newQs.push({section:"Reasoning",text:"If 'D' is the brother of 'C', and 'C' is the mother of 'B', what is 'D' to 'B'?",options:[{label:"A",text:"Brother",correct:false},{label:"B",text:"Father",correct:false},{label:"C",text:"Maternal uncle",correct:true},{label:"D",text:"Nephew",correct:false}],solution:"C is B's mother. D is C's brother, so D is B's maternal uncle."});
newQs.push({section:"Reasoning",text:"Find the odd one out: 4, 9, 16, 25, 36, 49",options:[{label:"A",text:"9",correct:false},{label:"B",text:"16",correct:false},{label:"C",text:"25",correct:false},{label:"D",text:"4",correct:false}],solution:"They are all perfect squares, but the question asks for odd one. Not a good question. Let me simplify."});
newQs.push({section:"Reasoning",text:"Statement: All dogs are mammals. Some mammals are pets. Conclusion: Some dogs are pets. Is this valid?",options:[{label:"A",text:"Yes",correct:false},{label:"B",text:"No",correct:false},{label:"C",text:"Cannot be determined",correct:false},{label:"D",text:"None",correct:false}],solution:"All dogs are mammals. Some mammals are pets. Some dogs may or may not be pets. The conclusion does not necessarily follow.");
newQs.push({section:"Reasoning",text:"Find the missing term: ACE, ? , MKO",options:[{label:"A",text:"FHJ",correct:false},{label:"B",text:"GIK",correct:false},{label:"C",text:"HIK",correct:false},{label:"D",text:"IGK",correct:false}],solution:"ACE: A(1)+2=C(3)+2=E(5). MKO: M(13)+2=O(15)+2=K? No. A,C,E are every 2nd letter. Next should be G(7),I(9),K(11) = GIK. Then M(13),K(11),O(15)? That doesn't work. Actually GIK: G(7) gap of 2 to I(9), gap of 2 to K(11). M(13) gap of 2 to O(15) gap of -4 to K(11). Inconsistent."});
newQs.push({section:"Reasoning",text:"If A > B, B > C, and C > D, then:",options:[{label:"A",text:"A > D",correct:true},{label:"B",text:"D > A",correct:false},{label:"C",text:"A = D",correct:false},{label:"D",text:"Cannot be determined",correct:false}],solution:"By transitive property: A > B > C > D, so A > D."});

console.log('Reasoning questions have logic errors in answers. Need to fix them.');
process.exit(1);
