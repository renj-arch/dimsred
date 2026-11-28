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
    id: 3601 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-economics/paper2', `<h3>Economics Paper II — Indian Economy & International Economics</h3>
<h3>Indian Economy — Post-Independence</h3>
<ul>
<li><strong>Planned Economy:</strong> Planning Commission (1950-2014), NITI Aayog (2015-present), Five Year Plans (1st to 12th), shift from planning to NITI Aayog's cooperative federalism.</li>
<li><strong>Industrial Policy:</strong> Industrial Policy Resolution 1948, 1948, 1956, 1977, 1991 (liberalization), industrial licensing, MRTP Act 1969, MRTP Act replacement by Competition Act 2002.</li>
<li><strong>Public Sector:</strong> Public sector enterprises (PSUs), disinvestment (disinvestment policy), privatization, strategic sectors, Navratna, Maharatna, Miniratna companies.</li>
<li><strong>Agricultural Policy:</strong> Green Revolution (1960s), White Revolution (Operation Flood, 1970), Blue Revolution (fisheries), Yellow Revolution (oilseeds), Golden Revolution (horticulture), Silver Revolution (eggs/poultry), Red Revolution (tomato), Blue Revolution (fish).</li>
<li><strong>Agricultural Marketing:</strong> Agricultural Produce Market Committee (APMC) Acts, Agricultural Produce Market Committees (APMCs), e-NAM (National Agriculture Market), Minimum Support Price (MSP), procurement, buffer stock, food security.</li>
<li><strong>Agricultural Credit:</strong> Rural credit, cooperative credit, Regional Rural Banks (RRBs), NABARD (National Bank for Agriculture and Rural Development), Kisan Credit Card (KCC), Priority Sector Lending (PSR).</li>
<li><strong>Food Security:</strong> Food Corporation of India (FCI), Public Distribution System (PDS), Targeted PDS (TPDS), Antyodaya Anna Yojana (AAY), Mid-Day Meal Scheme, food storage, buffer stock, food security vs food security vs food self-sufficiency.</li>
<li><strong>Land Reforms:</strong> Land reforms (abolition of zamindari, tenancy reforms, ceiling on land holdings, consolidation of holdings), land ceiling, benami transactions, land ceiling laws, ceilings on agricultural land holdings.</li>
</ul>
<h3>Indian Economy — Planning & Development</h3>
<ul>
<li><strong>Planning:</strong> Planning Commission (1950-2014), NITI Aayog (2015-present), Five Year Plans (1st to 12th), shift from planning to NITI Aayog's cooperative federalism.</li>
<li><strong>Economic Reforms 1991 (LPG):</strong> Liberalization, Privatisation, Globalisation — background (BoP crisis 1991), measures (industrial deregulation, delicensing, FDI, tariff reduction, exchange rate reforms — LERMS 1992, current account convertibility 1994), impact (growth acceleration, BoP crisis resolution, FDI inflows, IT boom).</li>
<li><strong>Fiscal Policy:</strong> Union Budget (Article 112), revenue account vs capital account, fiscal deficit (total expenditure - total receipts excluding borrowings), revenue deficit (revenue expenditure - revenue receipts), primary deficit (fiscal deficit - interest payments), FRBM Act 2003 targets (fiscal deficit 3% of GDP, revenue deficit elimination), fiscal consolidation roadmap.</li>
<li><strong>Monetary Policy:</strong> Reserve Bank of India (RBI) — monetary policy committee (MPC), inflation targeting framework (4% ± 2%), repo rate, reverse repo rate, CRR (cash reserve ratio), SLR (statutory liquidity ratio), OMOs (open market operations), marginal standing facility (MSF), liquidity adjustment facility (LAF), marginal standing facility (MSF).</li>
<li><strong>External Sector:</strong> Balance of Payments (BoP) — current account (trade balance, invisibles, net invisible), capital account (FDI, FPI, ECB, NRI deposits, banking capital), forex reserves, exchange rate management (managed float), FEMA (Foreign Exchange Management Act 1999), FEMA vs FERA (Foreign Exchange Regulation Act 1973), current account convertibility (1994), capital account convertibility (partial), Tarapore Committee (1997, 2006) recommendations on capital account convertibility.</li>
<li><strong>External Sector:</strong> Foreign Direct Investment (FDI) — automatic route &amp; government route sectors, FDI caps sector-wise, Foreign Portfolio Investment (FPI) — portfolio investment, External Commercial Borrowings (ECB), Non-Resident Indian (NRI) deposits, foreign trade policy (FTP) 2015-20 &amp; extensions, export promotion schemes (MEIS — replaced by RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), export promotion schemes (MEIS replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), export promotion schemes (MEIS replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), export promotion schemes (MEIS replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), export promotion schemes (MEIS replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units).</li>
</ul>
<h3>International Economics</h3>
<ul>
<li><strong>International Trade:</strong> Theory of comparative advantage (Ricardo), Heckscher-Ohlin model (factor endowments theory), terms of trade (net barter terms of trade, gross barter terms of trade, income terms of trade, single factorial terms of trade, double factorial terms of trade, real income terms of trade), gains from trade, trade policies (free trade vs protection — arguments for protection (infant industry, strategic trade policy, employment, balance of payments, national security, anti-dumping), instruments (tariffs — ad valorem &amp; specific, quotas, anti-dumping duties, countervailing duties, safeguard measures, export subsidies, export promotion schemes (MEIS — replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), trade agreements (multilateral — WTO (functions, Ministerial Conference, Dispute Settlement Body (DSB), Agreement on Agriculture (AoA) — amber box, green box, blue box subsidies; Agreement on Trade Related Aspects of Intellectual Property Rights (TRIPS) — patents, copyrights, trademarks, geographical indications; Agreement on Trade Related Investment Measures (TRIMS); Agreement on Textiles &amp; Clothing (phased out), General Agreement on Trade in Services (GATS) — modes 1-4, Sanitary &amp; Phytosanitary (SPS) measures, Technical Barriers to Trade (TBT), regional trade agreements — RTAs/FTAs (NAFTA, EU, ASEAN, SAARC (SAFTA), BIMSTEC, RCEP (Regional Comprehensive Economic Partnership — India opted out in 2019), CEPA (Comprehensive Economic Partnership Agreement — India-Japan, India-Korea, India-Singapore, Comprehensive Economic Cooperation Agreement (CECA) — India-Malaysia, India-Singapore, India-UAE CEPA (2022), India-Australia Economic Cooperation &amp; Trade Agreement (ECTA) (2022), India-UK FTA (negotiations), India-EU FTA (negotiations), India-US trade issues.</li>
<li><strong>Balance of Payments (BoP):</strong> Current account (trade in goods &amp; services, invisibles, net invisible), capital account (FDI, FPI, ECB, NRI deposits, banking capital), BoP crisis (1991), forex reserves, exchange rate management (managed float), REER (Real Effective Exchange Rate), REER (Real Effective Exchange Rate), REER (Real Effective Exchange Rate).</li>
<li><strong>Foreign Direct Investment (FDI):</strong> FDI routes (automatic route &amp; government route sectors), FDI caps sector-wise, Foreign Portfolio Investment (FPI) — portfolio investment, External Commercial Borrowings (ECB), NRI deposits, foreign trade policy (FTP) 2015-20 &amp; extensions, export promotion schemes (MEIS — replaced by RoDTEP, RoDTEP — Remission of Duties and Taxes on Exported Products, SEZs — Special Economic Zones, EOUs — Export Oriented Units), trade agreements (multilateral — WTO (functions, Ministerial Conference, Dispute Settlement Body (DSB), Agreement on Agriculture (AoA) — amber box, green box, blue box subsidies; Agreement on Trade Related Aspects of Intellectual Property Rights (TRIPS) — patents, copyrights, trademarks, geographical indications; Agreement on Trade Related Investment Measures (TRIMS); Agreement on Textiles &amp; Clothing (phased out), General Agreement on Trade in Services (GATS) — modes 1-4, Sanitary &amp; Phytosanitary (SPS) measures, Technical Barriers to Trade (TBT), regional trade agreements — RTAs/FTAs (NAFTA, EU, ASEAN, SAARC (SAFTA), BIMSTEC, IORA - Indian Ocean Rim Association), India-UAE CEPA (2022), India-Australia Economic Cooperation &amp; Trade Agreement (ECTA) (2022), India-UK FTA (negotiations), India-EU FTA (negotiations), India-US trade issues.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: Fiscal Multiplier</div><div class="ex-text">Question: "If MPC = 0.8, what is the investment multiplier?"</div><div class="ex-soln">Answer: Investment multiplier k = 1/(1-MPC) = 1/(1-0.8) = 1/0.2 = 5. A ₹1 crore increase in investment increases national income by ₹5 crore through the multiplier process.</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Fiscal Deficit:</strong> Fiscal deficit = Total expenditure - Total receipts (excluding borrowings)</li>
<li><strong>Primary Deficit:</strong> Primary deficit = Fiscal deficit - Interest payments</li>
<li><strong>Revenue Deficit:</strong> Revenue deficit = Revenue expenditure - Revenue receipts</li>
<li><strong>FRBM Act 2003:</strong> Fiscal deficit target 3% of GDP, revenue deficit elimination, debt-to-GDP ratio reduction targets (NK Singh Committee: centre 40%, states 20%, combined 60% by 2024-25).</li>
<li><strong>GST:</strong> Goods &amp; Services Tax (GST) — CGST (Central GST), SGST (State GST), IGST (Integrated GST), UTGST (Union Territory GST), GST Council decisions by 3/4th majority (2/3 of states + 1/3 centre), GST compensation cess on luxury &amp; demerit goods, GST compensation to states for revenue loss for 5 years (2017-2022), Integrated Goods &amp; Services Tax (IGST) on inter-state supplies, Central Goods &amp; Services Tax (CGST), State Goods &amp; Services Tax (SGST), Union Territory Goods &amp; Services Tax (UTGST), GST rates (0%, 5%, 12%, 18%, 28%), cess on luxury &amp; sin goods (compensation cess), GST Network (GSTN - IT backbone), GST Council decisions by 3/4th majority (2/3 of states + 1/3 centre), GST Council meetings, GST Council recommendations, GST Council decisions on rates, exemptions, thresholds, etc.</li>
<li><strong>External Sector:</strong> Balance of Payments (BoP) — current account (trade in goods &amp; services, invisibles, net invisible), capital account (FDI, FPI, ECB, NRI deposits, banking capital), BoP crisis (1991), forex reserves, exchange rate management (managed float), REER (Real Effective Exchange Rate), REER (Real Effective Exchange Rate), REER (Real Effective Exchange Rate).</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Economics answers: define concepts → explain mechanisms → support with data → discuss policy implications → way forward. Draw diagrams (AD-AS, Phillips curve, IS-LM, Keynesian cross, multiplier process). Quote data: India's GDP growth (~7%), inflation (~6-7%), fiscal deficit (~6% of GDP), forex reserves (~$600 billion), exports (~$700 billion), imports (~$700 billion), FDI inflows (~$85 billion), GDP per capita (~$2,500), population (~1.4 billion), literacy rate (~77.7%), unemployment rate (~7-8%), poverty headcount ratio (~22%), multidimensional poverty index (MPI ~25% → 15%), Gini coefficient (~0.35), human development index (HDI ~0.64), ranking ~132/191.</div></div>`, [
  {
    text: "Which of the following is NOT a component of GDP?",
    options: ["Consumption", "Investment", "Transfer payments", "Government spending"],
    correct: 2,
    sol: "Transfer payments (pensions, unemployment benefits) do not represent production of goods/services — excluded from GDP." },
  {
    text: "The investment multiplier is:",
    options: ["1/MPC", "1/(1-MPC)", "MPC/1-MPC", "1-MPC"],
    correct: 1,
    sol: "Investment multiplier k = 1/(1-MPC). If MPC = 0.8, k = 1/(1-0.8) = 5." },
  {
    text: "Which of the following is NOT a function of money?",
    options: ["Medium of exchange", "Store of value", "Unit of account", "Source of inflation"],
    correct: 3,
    sol: "Money functions: medium of exchange, unit of account, store of value, standard of deferred payment. Inflation is not a function of money." },
  {
    text: "Which of the following is NOT a tool of monetary policy?",
    options: ["Repo rate", "Cash Reserve Ratio", "Income tax", "Open market operations"],
    correct: 2,
    sol: "Income tax is a fiscal policy tool, not a monetary policy tool. Monetary policy tools: repo rate, CRR, SLR, OMO, MSF." },
  {
    text: "Which of the following is NOT a component of GDP?",
    options: ["Consumption", "Investment", "Transfer payments", "Government spending"],
    correct: 2,
    sol: "Transfer payments (pensions, unemployment benefits) do not represent production — excluded from GDP." }
]);
