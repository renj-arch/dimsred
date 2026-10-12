const fs = require('fs');
const path = require('path');

const outPath = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\opencode\\geo_sections_6_10.html';

let c = '';

c += `<!-- ===================== SECTION 6: MINERAL AND ENERGY RESOURCES ===================== -->\n`;
c += `<h2 id="minerals">6. Mineral & Energy Resources</h2>\n\n`;

c += `<h3>Classification of Minerals</h3>\n\n`;

c += `<p>India possesses a rich and diverse mineral endowment, with nearly the entire periodic table represented in its geological formations. The <span class="highlight">Indian mineral sector</span> contributes about 2.5% to the GDP and employs over 10 million people directly and indirectly. For UPSC, the study of minerals is vital because it links physical geology with economic geography, industrial location, and national security. Minerals are broadly classified into <span class="highlight">metallic</span>, <span class="highlight">non-metallic</span>, and <span class="highlight">energy minerals</span>, each with a distinct geological origin, distribution pattern, and economic significance.</p>\n\n`;

c += `<p><strong>Metallic Minerals</strong> are those from which metals are extracted. They are subdivided into ferrous (containing iron) and non-ferrous. <span class="highlight">Ferrous minerals</span> include iron ore, manganese, chromium, nickel, cobalt, and tungsten. These form the backbone of the metallurgical and heavy engineering industries. <span class="highlight">Non-ferrous minerals</span> include copper, bauxite (aluminium ore), zinc, lead, gold, silver, and tin. These are critical for the electrical, electronics, aerospace, and consumer goods industries. India is particularly well-endowed in iron ore, bauxite, and chromium but is deficient in copper, nickel, lead, and zinc, leading to significant import dependence.</p>\n\n`;

c += `<p><strong>Non-Metallic Minerals</strong> do not yield metals but are essential for construction, chemical, fertiliser, and refractory industries. Key non-metallic minerals include limestone (the most abundant, used in cement and steel), dolomite, mica, gypsum (for cement and fertiliser), kyanite and sillimanite (refractories), phosphate (fertiliser), rock salt, and building stones (granite, marble, sandstone, slate). India is the world's largest producer of mica and has some of the richest deposits of limestone and dolomite.</p>\n\n`;

c += `<p><strong>Energy Minerals</strong> are those used as sources of energy. This category includes fossil fuels (coal, petroleum, natural gas, oil shale, tar sands) and nuclear minerals (uranium, thorium). With the growing emphasis on the energy transition, the classification now increasingly includes <span class="highlight">critical minerals</span> like lithium, cobalt, rare earth elements (REEs), and graphite, which are essential for renewable energy technologies, electric vehicle batteries, and defence applications. India's National Mineral Policy 2019 and the recent <span class="highlight">Critical Minerals Mission</span> (2024) identify 30 critical minerals for strategic development.</p>\n\n`;

c += `<h4>Iron Ore</h4>\n\n`;

c += `<p>Iron ore is the <span class="highlight">most important metallic mineral in India</span>, forming the basis of the country's steel industry. India possesses the 4th largest iron ore reserves in the world, with about <strong>5.5 billion tonnes of hematite</strong> and <strong>10.5 billion tonnes of magnetite</strong>. Production stands at approximately <strong>250 million tonnes per year</strong>, making India the 3rd largest producer after China and Australia. There are <span class="highlight">five major types</span> of iron ore: <strong>Hematite</strong> (Fe2O3, 60-70% iron, red, the most important), <strong>Magnetite</strong> (Fe3O4, 70-72% iron, black, magnetic), <strong>Limonite</strong> (hydrated oxide, 40-60% iron, yellow-brown, low-grade), <strong>Siderite</strong> (FeCO3, 30-40% iron, grey, low-grade), and <strong>Laterite</strong> (residual iron-rich, variable, often nickel-bearing).</p>\n\n`;

c += `<p>The distribution of iron ore in India is concentrated in <span class="highlight">four major belts</span>:</p>\n\n`;

c += `<ul>\n`;
c += `<li><strong>The Odisha-Jharkhand Belt</strong> &mdash; This is the <span class="highlight">most important iron ore belt in India</span>, accounting for over 50% of total reserves and production. The deposits extend from the Bonai Range (Odisha) through the Singhbhum district (Jharkhand). Major mines include <strong>Badampahar</strong> (Mayurbhanj, Odisha), <strong>Noamundi</strong> (West Singhbhum, Jharkhand), <strong>Gua</strong> (Jharkhand), <strong>Kiriburu</strong> and <strong>Meghahatuburu</strong> (all in the Singhbhum region). The ore is of exceptionally high grade (62-68% Fe, hematite) and is located close to the surface, making extraction economical. The proximity to the Damodar Valley coal fields (Jharia, Raniganj, Bokaro) is a critical locational advantage for the steel plants of the region.</li>\n`;
c += `<li><strong>The Bellary-Chitradurga-Chikmagalur Belt (Karnataka)</strong> &mdash; This belt in the Dharwar Craton is the second most important iron ore region. Major mines include <strong>Bellary</strong> (the largest producer in Karnataka), <strong>Kudremukh</strong> (magnetite, 67% Fe, now closed due to environmental concerns), and <strong>Hospet</strong>. The Kudremukh mine, once the largest mechanised mine in India, was closed in 2006 following a Supreme Court order on environmental grounds. The Donimalai and Kumaraswamy mines in Bellary district are currently the main producers.</li>\n`;
c += `<li><strong>The Durg-Bastar-Chandrapur Belt (Chhattisgarh-Maharashtra)</strong> &mdash; This belt extends from the Bailadila Range in Chhattisgarh to Chandrapur in Maharashtra. <strong>Bailadila</strong> (the name means 'bull's hump') in Dantewada district is the single largest iron ore mining complex in India, with reserves of 1.2 billion tonnes of high-grade hematite (65-68% Fe). The ore from Bailadila is exported to Japan and South Korea via the Vizag port. Other mines include <strong>Rowghat</strong> (the largest unexploited deposit, 500 mt, pending forest clearance) and <strong>Dalli-Rajhara</strong> (which feeds the Bhilai Steel Plant).</li>\n`;
c += `<li><strong>The Goa-Maharashtra-Ratnagiri Belt</strong> &mdash; This belt consists of lateritic iron ore deposits of lower grade (50-55% Fe) but is economically important for export. <strong>Goa</strong> was once the largest iron ore exporter in India (50+ mt/yr), but mining was suspended from 2012 to 2021 following the Justice M.B. Shah Commission report on illegal mining. Mining resumed in 2021 with a cap of 20 mt/yr. The <strong>Redi</strong> and <strong>Vengurla</strong> mines in Maharashtra's Sindhudurg district are also part of this belt.</li>\n`;
c += `</ul>\n\n`;

c += `<div class="table-wrap"><table>\n`;
c += `<tr><th>State</th><th>Reserves (Bt)</th><th>Grade (% Fe)</th><th>Major Mines</th><th>Type</th></tr>\n`;
c += `<tr><td>Odisha</td><td>~3.0</td><td>62-67</td><td>Badampahar, Tomka, Joda, Koira</td><td>Hematite</td></tr>\n`;
c += `<tr><td>Jharkhand</td><td>~1.5</td><td>60-68</td><td>Noamundi, Gua, Kiriburu</td><td>Hematite</td></tr>\n`;
c += `<tr><td>Chhattisgarh</td><td>~2.0</td><td>65-68</td><td>Bailadila, Dalli-Rajhara, Rowghat</td><td>Hematite</td></tr>\n`;
c += `<tr><td>Karnataka</td><td>~2.5</td><td>60-67</td><td>Bellary, Kudremukh, Hospet</td><td>Hematite/Magnetite</td></tr>\n`;
c += `<tr><td>Goa</td><td>~0.5</td><td>50-55</td><td>Pale, Sirigao, Codli</td><td>Lateritic Hematite</td></tr>\n`;
c += `</table></div>\n\n`;

c += `<h4>Manganese</h4>\n\n`;
c += `<p>Manganese is an <span class="highlight">essential input in steel making</span> (as a deoxidiser and alloying agent to improve strength and hardness). About 90% of manganese is consumed by the steel industry. India has the 5th largest manganese reserves in the world (about 600 million tonnes), with production of about 2.5 million tonnes annually. The major manganese-producing states are:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Madhya Pradesh</strong> &mdash; The leading producer, with major mines in <strong>Balaghat</strong> district (the largest and richest manganese mines in India &mdash; the Bharweli, Gumgaon, and Tirodi mines). The deposits are of the 'Gondite' type (manganese-rich metamorphic rocks).</li>\n`;
c += `<li><strong>Maharashtra</strong> &mdash; <strong>Nagpur</strong> and <strong>Bhandara</strong> districts are the main producers, with the Mansar, Kandri, and Chikla mines. The deposits are in the Sausar Group of rocks.</li>\n`;
c += `<li><strong>Odisha</strong> &mdash; <strong>Sundergarh</strong> district (the Bonai-Keonjhar belt) is the main producer, with the Joda, Kuldihi, and Gorumahisani mines.</li>\n`;
c += `<li><strong>Karnataka</strong> &mdash; <strong>Shimoga</strong> and <strong>Chitradurga</strong> districts are the major producers, with the deposits in the Dharwar schist belts.</li>\n`;
c += `</ul>\n\n`;

c += `<h4>Copper</h4>\n\n`;
c += `<p>Copper is a <span class="highlight">strategic metal</span> essential for electrical wiring, electronics, construction, and transportation. India's copper reserves are modest (about 100 million tonnes of ore, 0.5 million tonnes of copper metal) and production (about 35,000 tonnes/yr) meets less than 10% of domestic demand, making India a <strong>net importer of copper</strong>. The major copper-producing regions are:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Rajasthan</strong> &mdash; The <span class="highlight">largest producer of copper in India</span>, with the <strong>Khetri Copper Belt</strong> in Jhunjhunu and Sikar districts. The Khetri mine and the nearby Kolihan, Banwas, Chandmari, and Dariba mines are operated by <strong>Hindustan Copper Limited (HCL)</strong>. The Khetri smelter was set up with Bulgarian collaboration and has a capacity of 40,000 tonnes/yr.</li>\n`;
c += `<li><strong>Jharkhand</strong> &mdash; The <strong>Singhbhum Copper Belt</strong> (the 'Copper Belt of India' historically) with mines at <strong>Mosaboni</strong>, <strong>Rakha</strong>, <strong>Surda</strong>, and <strong>Kendadih</strong>. The Mosaboni mine was once the deepest copper mine in Asia (over 800 m), but operations ceased in 2003 due to depletion and falling ore grades.</li>\n`;
c += `<li><strong>Madhya Pradesh</strong> &mdash; The <strong>Malanjkhand Copper Mine</strong> (Balaghat district) is the largest open-pit copper mine in India and the most important copper producer, with ore reserves of 125 million tonnes at 1.2% copper. It is also operated by HCL.</li>\n`;
c += `</ul>\n\n`;

c += `<h4>Bauxite (Aluminium Ore)</h4>\n\n`;
c += `<p>Bauxite is the <span class="highlight">primary ore of aluminium</span>, and India is the 5th largest bauxite producer in the world, with reserves of about 3 billion tonnes (the 6th largest). Production is about 25 million tonnes/yr. Bauxite is formed by the intense chemical weathering (lateritisation) of aluminium-silicate rocks under tropical conditions. The major bauxite-producing regions are:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Odisha</strong> &mdash; The <span class="highlight">largest bauxite producer in India</span>, accounting for over 50% of production. The deposits are concentrated in the <strong>Eastern Ghats Bauxite Belt</strong>, extending across <strong>Koraput</strong>, <strong>Kalahandi</strong>, and <strong>Sundergarh</strong> districts. The <strong>Panchpatmali</strong> plateau (Koraput) is the largest bauxite deposit in India, with 300 million tonnes of reserves. The <strong>Baphlimali</strong> and <strong>Sijimali</strong> deposits in Rayagada district are also significant.</li>\n`;
c += `<li><strong>Gujarat</strong> &mdash; The second largest producer, with deposits in the Kutch, Jamnagar, and Bhavnagar districts. The bauxite here is of the 'lateritic blanket' type.</li>\n`;
c += `<li><strong>Jharkhand</strong> &mdash; The <strong>Chhota Nagpur Plateau</strong> contains the <strong>Bauxite Triangle</strong> of India, with deposits in <strong>Lohardaga</strong>, <strong>Gumla</strong>, and <strong>Palamu</strong> districts. The bauxite here feeds the aluminium plants at Rourkela and Renukoot.</li>\n`;
c += `<li><strong>Other states</strong> &mdash; Madhya Pradesh (Anuppur, Katni), Maharashtra (Kolhapur, Ratnagiri), Goa, and Andhra Pradesh (Visakhapatnam, East Godavari) also have significant bauxite deposits.</li>\n`;
c += `</ul>\n\n`;

c += `<h4>Gold</h4>\n\n`;
c += `<p>India's gold production is negligible compared to its consumption (about 800 tonnes/yr, the 3rd largest consumer in the world). The country produces only about 1.5 tonnes/yr from domestic mines. The major gold mining regions are:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Kolar Gold Fields (Karnataka)</strong> &mdash; The <span class="highlight">most famous gold mining region in India</span>, operational for over 120 years. The mines were closed in <strong>2001</strong> due to deepening costs (the mines reached 3,200 m depth, the second deepest in the world), falling ore grades, and labour issues. The KGF produced over 800 tonnes of gold during its lifetime.</li>\n`;
c += `<li><strong>Hutti Gold Mines (Karnataka)</strong> &mdash; The <span class="highlight">only operational gold mine in India</span> today, located in Raichur district. It is operated by <strong>Hutti Gold Mines Company Limited (HGML)</strong> and produces about 1.5-2 tonnes/yr. The Hutti deposit is one of the oldest known gold deposits in the world, with mining dating back to the Ashokan period.</li>\n`;
c += `<li><strong>Ramagiri Gold Fields (Andhra Pradesh)</strong> &mdash; Located in Anantapur district, now closed.</li>\n`;
c += `<li><strong>Sonbhadra (Uttar Pradesh)</strong> &mdash; The state's only gold deposit, with recent exploration by the Geological Survey of India identifying 52 million tonnes of gold-bearing ore.</li>\n`;
c += `</ul>\n\n`;

c += `<h4>Mica</h4>\n\n`;
c += `<p>India is the <span class="highlight">world's largest producer and exporter of mica</span>, accounting for about 60% of global production. Mica is a group of sheet silicate minerals valued for their perfect basal cleavage, heat resistance, and electrical insulating properties. India's <strong>Mica Belt</strong> extends across three states:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Jharkhand</strong> &mdash; The <strong>Koderma</strong> district (the 'Mica Capital of India') is the largest producer, along with the adjacent Giridih and Hazaribagh districts.</li>\n`;
c += `<li><strong>Rajasthan</strong> &mdash; The <strong>Bhilwara</strong> belt (Bhilwara, Ajmer, Tonk, Jaipur districts) is the second largest mica producer.</li>\n`;
c += `<li><strong>Andhra Pradesh</strong> &mdash; The <strong>Nellore</strong> mica belt (Nellore, Guntur, Prakasam districts) produces the high-quality 'ruby mica' prized for its clarity and thermal stability.</li>\n`;
c += `</ul>\n\n`;

c += `<h4>Limestone</h4>\n\n`;
c += `<p>Limestone is the <span class="highlight">most abundant non-metallic mineral in India</span>, with reserves of about 200 billion tonnes. It is the primary raw material for the cement industry (which consumes 90% of limestone production) and is also used in steel making (as flux), fertiliser, chemical industries, and sugar refining. Major limestone-producing states are <strong>Madhya Pradesh</strong> (the largest), <strong>Rajasthan</strong>, <strong>Andhra Pradesh</strong>, <strong>Gujarat</strong>, <strong>Tamil Nadu</strong>, <strong>Karnataka</strong>, and <strong>Chhattisgarh</strong>.</p>\n\n`;

c += `<h3>Energy Resources</h3>\n\n`;
c += `<h4>Coal</h4>\n\n`;
c += `<p>Coal is India's <span class="highlight">primary energy source</span>, accounting for about 55% of the country's primary energy consumption and 72% of electricity generation. India is the <strong>2nd largest producer and 2nd largest importer of coal in the world</strong>, producing about 830 million tonnes/yr (2023-24) and importing about 250 million tonnes. Coal is classified into <span class="highlight">four grades</span> based on carbon content and calorific value:</p>\n\n`;

c += `<ul>\n`;
c += `<li><strong>Anthracite</strong> &mdash; The highest grade (over 80% carbon, calorific value 8,700+ kCal/kg), found only in small quantities in the Jammu and Kashmir region (in the Eocene-aged lignite deposits). It is rare in India.</li>\n`;
c += `<li><strong>Bituminous</strong> &mdash; The <span class="highlight">most important grade</span> for industrial use (60-80% carbon, 6,000-8,700 kCal/kg). It is used in steel making (coking coal) and power generation (non-coking/thermal coal). Indian bituminous coal is of sub-bituminous grade, with high ash content (25-45%) and low sulphur &mdash; which makes it environmentally cleaner for sulphur emissions but less efficient in heat generation.</li>\n`;
c += `<li><strong>Lignite</strong> &mdash; The brown coal (40-60% carbon, 3,500-5,000 kCal/kg) with high moisture content (30-60%). Used mainly for electricity generation at pit-head thermal plants.</li>\n`;
c += `<li><strong>Peat</strong> &mdash; The lowest grade (less than 40% carbon, low calorific value), representing the first stage of coal formation. Found in small quantities in the Nilgiris and the Himalayan foothills. Not commercially significant in India.</li>\n`;
c += `</ul>\n\n`;

c += `<p>The geological distribution of Indian coal is divided into two major categories:</p>\n\n`;
c += `<ul>\n`;
c += `<li><strong>Gondwana Coal</strong> &mdash; This accounts for <span class="highlight">98% of India's coal reserves and 85% of production</span>. It was formed during the Permian to Lower Cretaceous periods (about 250-100 million years ago) in the ancient Gondwana landmass. The coal is found in a series of basins that run along the present-day Damodar, Son, Mahanadi, and Godavari river valleys. These basins were deep, elongated rift valleys (grabens) where thick vegetation accumulated and was later compressed. The major Gondwana coal fields include:\n`;
c += `<ul>\n`;
c += `<li><strong>The Damodar Valley</strong> &mdash; The <span class="highlight">richest and most important coal-bearing region in India</span>, containing about 50% of total reserves. The fields include <strong>Raniganj</strong> (the oldest coal mine in India, started in 1774), <strong>Jharia</strong> (the largest producer, famous for its prime coking coal and also for underground coal fires burning since 1916), <strong>Bokaro</strong>, and <strong>Karanpura</strong>. The proximity to the Chhota Nagpur iron ore belt made this region the natural location for India's steel industry.</li>\n`;
c += `<li><strong>Talcher</strong> (Odisha) &mdash; The largest single coal field in India by reserves (51 billion tonnes), producing high-ash thermal coal for the power sector.</li>\n`;
c += `<li><strong>Korba</strong> (Chhattisgarh) &mdash; The second largest producing field, with high-grade thermal coal feeding the massive Korba super thermal power plant.</li>\n`;
c += `<li><strong>Singrauli</strong> (MP/UP border) &mdash; One of the largest coal fields, with 10 billion tonnes of reserves, powering the Singrauli thermal power complex (the largest power generation hub in India).</li>\n`;
c += `<li><strong>Godavari Valley</strong> (Telangana) &mdash; The Singareni Collieries (the oldest government coal mining company) operate the Kothagudem, Ramagundam, and Yellandu mines.</li>\n`;
c += `</ul></li>\n`;
c += `<li><strong>Tertiary Coal</strong> &mdash; This is younger coal (Eocene-Miocene, about 50-20 million years old) found in the <span class="highlight">northeastern states</span> of Assam, Meghalaya, Nagaland, Arunachal Pradesh, and also in Kashmir and Rajasthan. The Assam coal fields include <strong>Makum</strong> (the largest, with thick seams of up to 30 m), <strong>Ledo</strong>, and <strong>Jaipur</strong>. Assam coal is of high grade (low ash, high sulphur) but is difficult to extract due to the hilly terrain and forest cover. The <strong>Neyveli Lignite</strong> deposits in Tamil Nadu (the largest lignite deposits in India, about 30 billion tonnes) are also Tertiary in age, formed in a coastal lagoon environment. Neyveli has three open-pit mines feeding the Neyveli Thermal Power Station (the largest lignite-based power plant in India).</li>\n`;
c += `</ul>\n\n`;

c += `<p><strong>Coal India Limited (CIL)</strong> is the <span class="highlight">largest coal producer in the world</span>, producing about 700 million tonnes/yr and accounting for 80% of India's coal output. It operates through seven subsidiaries: Eastern Coalfields (ECL), Bharat Coking Coal (BCCL), Central Coalfields (CCL), Western Coalfields (WCL), South Eastern Coalfields (SECL), Northern Coalfields (NCL), and Mahanadi Coalfields (MCL). The <strong>Coal Crisis of 2021-22</strong> was a severe power sector disruption caused by critically low coal stocks at thermal plants (an average of 4 days' supply against the norm of 15-30 days), triggered by a post-COVID power demand surge (up 18% year-on-year), heavy rains flooding coal mines, insufficient railway rake availability, and the structural decline in domestic coal production growth (which lagged behind power demand growth for a decade). The crisis exposed the fragility of India's coal-dependent power system and accelerated the push for renewable energy.</p>\n\n`;

fs.writeFileSync(outPath, c, 'utf8');
console.log('Section 6 (part 1) written: ' + c.length + ' chars');
