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
    id: 2911 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-management/paper2', `<h3>Management Paper II — HRM, Marketing, Financial Management & Operations</h3>
<h3>Human Resource Management</h3>
<ul>
<li><strong>HRM vs HRD:</strong> HRM (maintenance, administration) vs HRD (development, growth of people).</li>
<li><strong>Job Analysis:</strong> Job analysis (process of collecting info about jobs), Job description (duties, responsibilities), Job specification (qualifications, skills, experience required).</li>
<li><strong>Recruitment:</strong> Internal sources (promotions, transfers, employee referrals) & External sources (advertisements, employment exchanges, campus recruitment, labour contractors).</li>
<li><strong>Selection:</strong> Application form, preliminary interview, selection tests (intelligence, aptitude, proficiency, personality), interview, reference check, medical examination, final selection.</li>
<li><strong>Training & Development:</strong> On-the-job (apprenticeship, coaching, job rotation, internship) & Off-the-job (lectures, case studies, role playing, simulation, vestibule training).</li>
<li><strong>Performance Appraisal:</strong> Methods — Traditional (ranking, paired comparison, graphic rating scale, checklist), Modern (MBO, 360-degree feedback, BARS, Assessment centre).</li>
<li><strong>Compensation:</strong> Components — Basic pay, Dearness allowance, House rent allowance, Incentives, Fringe benefits (provident fund, gratuity, insurance, medical).</li>
<li><strong>Industrial Relations:</strong> Trade unions, Collective bargaining, Grievance procedure, Industrial disputes (strike, lockout), Labour laws (Factories Act 1948, Industrial Disputes Act 1947, Minimum Wages Act 1948, Payment of Wages Act 1936, Employees' Provident Fund Act 1952, Employees' State Insurance Act 1948).</li>
</ul>
<h3>Marketing Management</h3>
<ul>
<li><strong>Marketing Concept:</strong> Production concept, Product concept, Selling concept, Marketing concept, Societal marketing concept.</li>
<li><strong>Marketing Mix (4Ps):</strong> Product (product mix, product life cycle — introduction, growth, maturity, decline), Price (pricing methods — cost-plus, skimming, penetration, psychological, differential), Place (channels of distribution — direct, indirect, intensive/selective/exclusive distribution), Promotion (promotion mix — advertising, personal selling, sales promotion, public relations, direct marketing).</li>
<li><strong>STP Framework:</strong> Segmentation (geographic, demographic, psychographic, behavioural), Targeting (undifferentiated, differentiated, concentrated), Positioning (positioning statement, perceptual mapping).</li>
<li><strong>Consumer Behaviour:</strong> Buying decision process (need recognition, information search, evaluation of alternatives, purchase decision, post-purchase behaviour), Factors affecting consumer behaviour (cultural, social, personal, psychological).</li>
<li><strong>Marketing Research:</strong> Marketing research process (define problem, develop research plan, collect information, analyse information, present findings), Marketing Information System (MIS).</li>
</ul>
<h3>Financial Management</h3>
<ul>
<li><strong>Financial Management:</strong> Meaning, scope, objectives (profit maximisation vs wealth maximisation), finance functions (investment, financing, dividend, liquidity decisions).</li>
<li><strong>Capital Budgeting:</strong> Techniques — Payback period, Accounting rate of return, Net Present Value (NPV), Internal Rate of Return (IRR), Profitability Index.</li>
<li><strong>Capital Structure:</strong> Capital structure (mix of debt and equity), Cost of capital (cost of debt, cost of equity, WACC), Leverage (operating leverage, financial leverage, combined leverage), Capital structure theories (Net income approach, Net operating income approach, Traditional approach, MM approach).</li>
<li><strong>Working Capital Management:</strong> Working capital (gross & net), Factors affecting working capital, Cash management (motives for holding cash, cash management), Receivables management (credit policy, credit terms, collection policy), Inventory management (EOQ, ABC analysis, JIT).</li>
<li><strong>Dividend Policy:</strong> Dividend policy factors (earnings stability, cash flow position, growth opportunities, legal constraints, shareholder preferences), Dividend models (Walter's model, Gordon's growth model, MM hypothesis), Bonus shares & Stock split.</li>
</ul>
<h3>Production & Operations Management</h3>
<ul>
<li><strong>Production Planning & Control:</strong> Production planning (routing, scheduling, dispatching, follow-up), Production control (dispatching, expediting, inspection, corrective action).</li>
<li><strong>Inventory Management:</strong> Inventory costs (ordering cost, carrying cost, shortage cost), EOQ (Economic Order Quantity = √(2DS/H)), ABC analysis, JIT (Just-in-Time), MRP (Material Requirements Planning).</li>
<li><strong>Quality Management:</strong> Quality control (inspection, statistical quality control), TQM (Total Quality Management), Six Sigma (DMAIC — Define, Measure, Analyse, Improve, Control), ISO 9000 series, Kaizen.</li>
<li><strong>Facility Location & Layout:</strong> Factors affecting location (proximity to market, raw materials, labour, transportation, utilities), Layout types (process layout, product layout, fixed position layout, combination layout).</li>
<li><strong>Project Management:</strong> PERT (Program Evaluation & Review Technique), CPM (Critical Path Method), Critical path, Float/Slack, Crashing.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: EOQ Calculation</div><div class="ex-text">Question: Annual demand = 10,000 units, Ordering cost = ₹100 per order, Holding cost = ₹5 per unit per year. Calculate EOQ.</div><div class="ex-soln">Answer: EOQ = √(2DS/H) = √(2 × 10,000 × 100 / 5) = √(200,000) ≈ 447 units. Annual ordering cost = (D/Q) × S = (10,000/447) × 100 ≈ ₹2,237. Annual holding cost = (Q/2) × H = (447/2) × 5 ≈ ₹1,117.50.</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>POSDCORB:</strong> Planning, Organising, Staffing, Directing, Coordinating, Reporting, Budgeting.</li>
<li><strong>4Ps of Marketing:</strong> Product, Price, Place, Promotion.</li>
<li><strong>STP:</strong> Segmentation, Targeting, Positioning.</li>
<li><strong>Porter's Five Forces:</strong> Threat of new entrants, Bargaining power of buyers, Bargaining power of suppliers, Threat of substitutes, Competitive rivalry.</li>
<li><strong>BCG Matrix:</strong> Stars (high growth, high share), Cash cows (low growth, high share), Question marks (high growth, low share), Dogs (low growth, low share).</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Management answers: theory → application → example → conclusion. Draw diagrams (Porter's five forces, BCG matrix, SWOT, product life cycle, organisational structure). Quote thinkers (Fayol, Taylor, Maslow, Herzberg, McGregor, Drucker, Porter, Kotler). Data: India's GDP growth, MSME contribution (~30% GDP), Startup India (~100+ unicorns), Make in India, Production Linked Incentive (PLI) scheme.</div></div>`, [
  {
    text: "EOQ formula is:",
    options: ["√(2DS/H)", "√(DS/2H)", "√(2H/DS)", "√(2H/D)S"],
    correct: 0,
    sol: "EOQ = √(2DS/H) where D = annual demand, S = ordering cost per order, H = holding cost per unit per year." },
  {
    text: "Which of the following is NOT a function of marketing?",
    options: ["Product development", "Pricing", "Distribution", "Recruitment"],
    correct: 3,
    sol: "Recruitment is an HR function, not a marketing function." },
  {
    text: "WACC stands for:",
    options: ["Weighted Average Cost of Capital", "Weighted Average Cost of Capital", "Weighted Average Cost of Capital", "Weighted Average Cost of Capital"],
    correct: 0,
    sol: "WACC = Weighted Average Cost of Capital." },
  {
    text: "Herzberg's motivators include:",
    options: ["Salary", "Job security", "Achievement", "Working conditions"],
    correct: 2,
    sol: "Achievement is a motivator (intrinsic factor). Salary, job security, working conditions are hygiene factors." },
  {
    text: "ABC analysis in inventory management classifies items by:",
    options: ["Value", "Volume", "Weight", "Supplier"],
    correct: 0,
    sol: "ABC analysis classifies inventory items by value: A items (high value, low quantity), B items (medium), C items (low value, high quantity)." }
]);
