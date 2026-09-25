// Auto-generate a printable GS-Geography FIGURES pack (real labelled outline
// images, hotlinked live from Wikimedia Commons / NOAA - zero local storage).
//
// Each entry maps a geography topic (normalized name) to one labelled figure:
//   url   - hotlinked image source (Commons Special:FilePath or direct URL)
//   sec   - section banner text
//   marks - what the student must mark/label in an exam answer
//   src   - attribution / license line
//   topics - normalized topic names this figure answers (from topic-layers keys)
//
// Then it scans data/topic-layers.json for geography topics; names that have a
// matching figure render a page, names WITHOUT a figure are printed to the
// console + listed in the pack footer so future topics are visible for mapping.
//
// Usage: node scripts/build-geography-figures.js

var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data');
var LAYERS_FILE = path.join(DATA, 'topic-layers.json');
var OUT_FILE = path.join(__dirname, '..', 'geography-figures.html');

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function C(name, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=' + (w || 1000); }
function NOAA(p) { return 'https://www.pmel.noaa.gov/elnino/sites/default/files/thumbnails/image/' + p; }

// Topic (normalized) -> figure. Future topics: add one line here, re-run script.
var FIGURES = [
  {
    url: C('India_states_and_union_territories_map.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 States & UTs (Political)',
    marks: ['28 states + 8 UTs', 'capitals', 'neighbouring countries (China / Pak / Nepal / Bangladesh / Myanmar)', 'practice: redraw from a blank outline'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india political map', 'states and union territories of india', 'states of india', 'union territories of india']
  },
  {
    url: C('India_physical_map.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 Physical Map',
    marks: ['Himalayas (Great / Middle / Outer)', 'Indo-Gangetic plain', 'Peninsular plateau (Malwa / Deccan / Chota Nagpur)', 'Vindhya\u2013Satpura', 'Western / Eastern Ghats', 'coasts (Konkan / Malabar / Coromandel)', 'Thar desert', 'major rivers (Ganga, Yamuna, Brahmaputra, Godavari, Krishna, Narmada, Kaveri)'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india physical map', 'physical geography of india', 'physical divisions of india']
  },
  {
    url: C('India_map_blank.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 Blank Outline (Practice Sheet)',
    marks: ['trace rivers, ranges, plateaus, passes, ports on the outline', 'then re-draw 2\u20133 examples per topic'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india blank map', 'india outline map']
  },
  {
    url: C('India_earthquake_zone_map.svg'),
    sec: 'India \u00b7 Geophysics', title: 'India \u2014 Seismic Zones (BIS)',
    marks: ['Zone V (whole NE, Kutch, parts of J&K\u2013Himachal, Andamans)', 'Zone II (peninsular shield)', 'collision front along the Himalayan arc', 'Indo-Australian vs Eurasian plate boundary'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['earthquake', 'seismic zones of india', 'earthquakes in india']
  },
  {
    url: C('India_southwest_summer_monsoon_onset_map_en.svg'),
    sec: 'India \u00b7 Climate', title: 'India \u2014 Southwest Monsoon Onset',
    marks: ['Kerala onset (~1 June)', 'Arabian Sea (Bombay) branch', 'Bay of Bengal branch', 'onset isochrones advancing NW', 'ITCZ shift', 'two branches meet over the Himalayas'],
    src: 'Source: Wikimedia Commons (Saravask) \u00b7 CC BY-SA 3.0',
    topics: ['monsoon', 'southwest monsoon', 'indian monsoon']
  },
  {
    url: C('Indian_monsoon.png'),
    sec: 'India \u00b7 Climate', title: 'Indian Monsoon \u2014 Progress Isochrones',
    marks: ['onset dates (1 June Kerala \u2192 15 July UP/Rajasthan)', 'retreat lines (Sep\u2013Oct)', 'advance (dark) vs retreat (light) isochrones'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['monsoon', 'indian monsoon', 'retreating monsoon']
  },
  {
    url: C('Plates_tect2_en.svg'),
    sec: 'World \u00b7 Geophysics', title: 'Tectonic Plate Boundaries (World)',
    marks: ['convergent (Himalayan front)', 'divergent (Mid-Atlantic ridge, East Pacific rise)', 'transform (San Andreas)', 'Indian plate, Eurasian plate, Pacific ring of fire'],
    src: 'Source: Wikimedia Commons (USGS-derived) \u00b7 Public domain',
    topics: ['plate tectonics', 'tectonic plates', 'continental drift', 'volcano', 'earthquake']
  },
  {
    url: C('Tectonic_plate_boundaries.png'),
    sec: 'World \u00b7 Geophysics', title: 'Plate Boundaries \u2014 Cross-section Types',
    marks: ['divergent \u2192 ocean-floor spreading & mid-ocean ridges', 'convergent \u2192 subduction trench + volcanic arc / collision \u2192 mountains', 'transform \u2192 strike-slip fault'],
    src: 'Source: Wikimedia Commons (USGS, Jose F. Vigil) \u00b7 Public domain',
    topics: ['plate tectonics', 'volcano', 'earthquake']
  },
  {
    url: C('Volcano_scheme.svg', 900),
    sec: 'World \u00b7 Geomorphology', title: 'Volcano \u2014 Labelled Structure',
    marks: ['magma chamber', 'conduit / pipe', 'throat', 'crater', 'vent', 'parasitic cone', 'lava flow', 'ash-bed layers', 'flank, base, bedrock (numbered 1\u201315 list)'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 2.5/3.0',
    topics: ['volcano', 'volcanoes', 'volcanic eruption']
  },
  {
    url: C('Stratovolcano_cross-section.svg', 900),
    sec: 'World \u00b7 Geomorphology', title: 'Stratovolcano / Composite Cone \u2014 Cross-section',
    marks: ['alternating lava & pyroclastic layers', 'central vent + conduit', 'magma chamber', 'side vent', 'contrast: shield (Mauna Loa) v/s cinder cone'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['volcano', 'volcanic eruption']
  },
  {
    url: C('Epicenter_Diagram.svg', 900),
    sec: 'World \u00b7 Geophysics', title: 'Earthquake \u2014 Focus & Epicentre',
    marks: ['focus / hypocentre (deep rupture point)', 'epicentre (surface projection)', 'seismic waves radiating outward', 'P vs S waves', 'shallow vs deep-focus zones'],
    src: 'Source: Wikimedia Commons (deriv. of Sam Hocevar) \u00b7 CC BY-SA / GFDL',
    topics: ['earthquake', 'earthquakes in india']
  },
  {
    url: C('Hurricane-en.svg'),
    sec: 'World \u00b7 Climate', title: 'Tropical Cyclone \u2014 Anatomy (Hurricane)',
    marks: ['eye (calm centre)', 'eyewall (max winds)', 'spiral rainbands', 'outflow aloft', 'anticlockwise (N-Hemisphere) due to Coriolis', 'warm-core low'],
    src: 'Source: Wikimedia Commons (Kelvinsong) \u00b7 CC BY 3.0',
    topics: ['cyclone', 'tropical cyclone', 'hurricane', 'typhoon']
  },
  {
    url: NOAA('normal-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 1: Normal Conditions',
    marks: ['easterly trade winds push warm pool west', 'thermocline slopes down to the west', 'cold upwelling off Peru / Ecuador', 'rains over the warm pool (so Indonesia / Philippines)'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['el nino', 'la nina']
  },
  {
    url: NOAA('nino-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 2: El Ni\u00f1o',
    marks: ['warm pool migrates eastwards to Central/East Pacific', 'thermocline flattens', 'upwelling suppressed off Peru', 'weak/normal contradiction over India',
      'mark for UPSC: weaker monsoon over India, droughts; heavy rain on W. coast of Americas'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['el nino', 'el nino southern oscillation']
  },
  {
    url: NOAA('nina-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 3: La Ni\u00f1a',
    marks: ['warm pool pushed further west', 'thermocline steepens', 'upwelling stronger than normal off Peru', 'stronger trade winds', 'often better SW monsoon & floods over India'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['la nina']
  },
  {
    url: C('Suez_canal_map.jpg'),
    sec: 'World \u00b7 Waterways', title: 'Suez Canal \u2014 Map',
    marks: ['links Mediterranean (Port Said) to Red Sea (Suez)', 'saves the Africa round-trip for Europe\u2013Asia trade', 'lies wholly in Egypt (Sinai to the east)', 'no locks (sea-level canal)', 'mark for UPSC: choke point + trade route answers'],
    src: 'Source: Wikimedia Commons (CIA map) \u00b7 Public domain',
    topics: ['suez canal']
  },
  {
    url: C('Panama_canal.svg'),
    sec: 'World \u00b7 Waterways', title: 'Panama Canal \u2014 Map',
    marks: ['links Atlantic (Col\u00f3n) to Pacific (Panama City)', 'saves the Cape Horn route', 'locks system lifting ships to Gatun Lake', 'cuts across the Isthmus of Panama', 'mark the approximate lock stations'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['panama canal']
  },
  {
    url: C('China_India_western_border_88.jpg'),
    sec: 'India \u00b7 Borders', title: 'India\u2013China Border \u2014 Western Sector (Aksai Chin / Siachen)',
    marks: ['Aksai Chin region & the Karakoram Pass', 'Siachen Glacier (the saltoro ridge) north flank', 'Line of Actual Control (LAC) of the west', 'Kashmir sector proximate to LoC with Pakistan'],
    src: 'Source: Wikimedia Commons (CIA map, 1988) \u00b7 Public domain',
    topics: ['siachen glacier', 'line of actual control', 'aksai chin', 'kashmir']
  },
  {
    url: C('China_India_eastern_border_88.jpg'),
    sec: 'India \u00b7 Borders', title: 'India\u2013China Border \u2014 Eastern Sector (McMahon / Tawang)',
    marks: ['McMahon Line along the crest of the Himalayas', 'NEFA (Arunachal) below the line', 'Tawang sector (disputed; 1962 flashpoint)', 'Doklam / Bhutan trijunction area (west of Tawang)'],
    src: 'Source: Wikimedia Commons (CIA map, 1988) \u00b7 Public domain',
    topics: ['mcmahon line', 'doklam', 'arunachal pradesh']
  },
  {
    url: C('1947_India_showing_Provinces,_States_and_Districts_by_Survey_of_India_(cropped).jpg'),
    sec: 'India \u00b7 Borders', title: 'India 1947 \u2014 Radcliffe Line & McMahon Line (Survey of India)',
    marks: ['Radcliffe Line border with Pakistan (part of today\u2019s LoC/Wagah)', 'McMahon Line border with China in the east', 'borders inherited at Independence, 1947', 'mark historical British-India provinces + princely states'],
    src: 'Source: Wikimedia Commons (Survey of India) \u00b7 Public domain',
    topics: ['radcliffe line', 'mcmahon line']
  },
  {
    url: C('Kashmir_map.svg'),
    sec: 'India \u00b7 Borders', title: 'Kashmir \u2014 LoC & Siachen',
    marks: ['Line of Control (India\u2013Pakistan) dividing J&K', 'Siachen Glacier to the north-east (Saltoro)', 'Gilgit-Baltistan (west of LoC)', 'Pok / Kargil sectors', 'mark for UPSC: border-dispute + mountain-warfare answers'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['kashmir', 'line of control', 'siachen glacier']
  },
  {
    url: C('Barren_Island_map.jpg'),
    sec: 'India \u00b7 Geomorphology', title: 'Barren Island \u2014 India\u2019s Only Active Volcano',
    marks: ['volcanic cone rising from the Andaman arc', 'position in the Andaman Islands (east of the Great Andamans)', 'subduction of the Indo-Australian plate under the Burma plate', 'only confirmed active volcano on the South Asian mainland shelf'],
    src: 'Source: Wikimedia Commons \u00b7 Public domain',
    topics: ['barren island']
  },
  {
    url: C('Taal_lake_vicinity.png'),
    sec: 'World \u00b7 Geomorphology', title: 'Taal Volcano & Lake \u2014 Vicinity Map',
    marks: ['Taal volcano island inside Taal Lake (caldera lake)', 'Batangas province / Luzon position', 'Caldera rim & main crater', '2020\u20132022 eruption activity on the island'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['taal volcano', 'volcano', 'volcanic eruption']
  },
  {
    url: C('Hawaiian_Eruption-numbers.svg'),
    sec: 'World \u00b7 Geomorphology', title: 'Shield Volcano \u2014 Hawaiian-Type Eruption',
    marks: ['broad, low-angle slopes built by fluid basaltic lava', 'central summit caldera + flank rift zones', 'contrast with composite cones (steep, layered)', 'typical of Mauna Loa / Mauna Kea & the Deccan traps type volcanism'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 4.0',
    topics: ['mauna loa', 'shield volcano']
  },
  {
    url: C('Gujarat_Gir_Somnath_district_locator_map.png'),
    sec: 'India \u00b7 Sanctuary & Forest', title: 'Gir Forest & Gir Somnath District \u2014 Locator',
    marks: ['Gir National Park & Wildlife Sanctuary (last Asiatic lion habitat)', 'Saurashtra / Gujarat location', 'coastal districts around Gir Somnath', 'mark for UPSC: Asiatic lion conservation + Project Lion answers'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['gir', 'gir national park']
  },
  {
    url: C('Amazon_river_basin.png'),
    sec: 'World \u00b7 Rivers', title: 'Amazon River \u2014 Basin',
    marks: ['largest drainage basin on Earth', 'rises in the Andes, empties into the Atlantic', 'Amazon rainforest + it is the biggest river by discharge', 'tributaries: Negro, Madeira, Xingu, Tapaj\u00f3s'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['amazon river']
  },
  {
    url: C('Mississippi_River_Watershed_Map_North_America.png'),
    sec: 'World \u00b7 Rivers', title: 'Mississippi\u2013Missouri \u2014 Basin & Watershed',
    marks: ['Mississippi + Missouri + Ohio = huge US watershed', 'drains ~40% of the conterminous US', 'Gulf of Mexico outlet via the Mississippi Delta', 'tributaries: Missouri, Ohio, Tennessee, Arkansas'],
    src: 'Source: Wikimedia Commons \u00b7 Public domain',
    topics: ['mississippi river']
  },
  {
    url: C('Missouri_River_basin_map.png'),
    sec: 'World \u00b7 Rivers', title: 'Missouri River \u2014 Basin',
    marks: ['longest river in the US', 'tributary of the Mississippi', 'Great Plains drainage', 'dams: Garrison, Oahe, Fort Peck'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 4.0',
    topics: ['missouri river']
  },
  {
    url: C('Mediterranean_Sea_location_map_(blank).svg'),
    sec: 'World \u00b7 Seas', title: 'Mediterranean Sea \u2014 Location Map',
    marks: ['links Atlantic (Gibraltar strait) to Asia', 'marginal seas: Adriatic, Aegean, Ionian, Black Sea via Bosporus', 'Suez canal connexion to the Red Sea & Indian Ocean', 'surrounding countries & the Levant coast'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['mediterranean sea']
  },
  {
    url: C('Gulf_of_Mexico_with_Labeled_Territorial_Waters.jpg'),
    sec: 'World \u00b7 Seas', title: 'Gulf of Mexico \u2014 Territorial Waters',
    marks: ['bounded by US (Florida\u2013Texas), Mexico, Cuba', 'Yucat\u00e1n Channel & Florida Strait connexions', 'Loop current \u2192 Gulf Stream feeds the Atlantic', 'hurricane breeding ground; oil platforms (GoM basin)'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY 4.0',
    topics: ['gulf of mexico']
  },
  {
    url: C('Caspian_Sea.svg'),
    sec: 'World \u00b7 Seas', title: 'Caspian Sea \u2014 Regional Map',
    marks: ['largest enclosed inland water body (Sea/Lake debate)', 'borders 5 states: Russia, Iran, Azerbaijan, Kazakhstan, Turkmenistan', 'Baku oil fields; Amu Darya & Volga inflow', 'below sea level (Caspian Depression)'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 4.0',
    topics: ['caspian sea']
  },
  {
    url: C('Baltic_Sea_location_map.svg'),
    sec: 'World \u00b7 Seas', title: 'Baltic Sea \u2014 Location Map',
    marks: ['semi-enclosed, almost freshwater (Baltic \u2018anomaly\u2019)', 'shallow, brackish, highly polluted historically', 'borders: Sweden, Finland, Baltics, Poland, Germany, Russia', 'connects to North Sea via Kattegat/Skagerrak'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0 de',
    topics: ['baltic sea']
  },
  {
    url: C('Atlantic_Ocean_-_en.png'),
    sec: 'World \u00b7 Oceans', title: 'Atlantic Ocean \u2014 Geography',
    marks: ['2nd largest ocean; the classic S-shape between Americas & Afro-Eurasia', 'Mid-Atlantic ridge (divergent boundary) in the middle', 'Bermuda triangle / trade routes & Gulf Stream', 'Mariana-depth: Puerto Rico Trench is the deepest Atlantic point'],
    src: 'Source: Wikimedia Commons \u00b7 Public domain',
    topics: ['atlantic ocean']
  },
  {
    url: C('Southern_Indian_Ocean_islands_bathymetric_location_map-2.png'),
    sec: 'World \u00b7 Oceans', title: 'Southern Ocean \u2014 Bathymetry & Islands',
    marks: ['encircles Antarctica south of 60\u00b0S', 'Antarctic Circumpolar Current (largest ocean current)', 'no land boundary (it is a ring of ocean)', 'sea ice & polar climate; Marion & Prince Edward islands'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY 4.0',
    topics: ['southern ocean']
  },
  {
    url: C('Major_cities_threatened_by_sea_level_rise.png'),
    sec: 'World \u00b7 Climate', title: 'Sea Level Rise \u2014 Major Cities Threatened',
    marks: ['coastal megacities exposed: Mumbai, Dhaka, Shanghai, NY, Lagos...', 'delta + low-lying island states most vulnerable', 'thermosteric + glacial/island ice melt contributions', 'sea-level rise as a climate-change exam answer map'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['sea level rise']
  },
  {
    url: C('Marshall_Islands_location_map.svg'),
    sec: 'World \u00b7 Islands', title: 'Marshall Islands \u2014 Location Map',
    marks: ['two island chains: Ratak (sunrise) & Ralik (sunset)', 'atoll structure (Majuro, Kwajalein)', 'US Compact / Kwajalein missile range', 'climate-vulnerable low-lying atoll state'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY 3.0',
    topics: ['marshall islands']
  },
  {
    url: C('Solomon_Islands_location_map.svg'),
    sec: 'World \u00b7 Islands', title: 'Solomon Islands \u2014 Location Map',
    marks: ['archipelago east of New Guinea (Melanesia)', 'Guadalcanal (WWII battle site)', 'on the Pacific ring of fire (tectonically active)', 'militarisation & geopolitics (2022 China security pact)'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY 3.0',
    topics: ['solomon islands']
  },
  {
    url: C('Faroe_Islands_location_map.svg'),
    sec: 'World \u00b7 Islands', title: 'Faroe Islands \u2014 Location Map',
    marks: ['18 volcanic islands between Norway & Iceland', 'autonomous territory of Denmark', 'North Atlantic drift climate (mild for the latitude)', 'deep fjords/fjord-like inlets & basaltic cliffs'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['faroe islands']
  },
  {
    url: C('Heard_Island_and_McDonald_Islands_location_map_Topographic_791px.png'),
    sec: 'World \u00b7 Islands', title: 'Heard Island & McDonald Islands \u2014 Sub-Antarctic Locator',
    marks: ['southern Indian Ocean, ~53\u00b0S (sub-Antarctic / polar-front belt)', 'Australian external territory', 'Big Ben volcano \u2192 Mawson Peak (2,745 m, Australia\u2019s highest peak)', 'glaciated Laurens Peninsula; periglacial tundra climate', 'no permanent population \u2014 research & conservation reserve'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['heard island and mcdonald islands', 'heard and mcdonald islands', 'heard island']
  },
  {
    url: C('Coney_Island_Aerial.jpg'),
    sec: 'World \u00b7 Coastal Landforms', title: 'Coney Island \u2014 Barrier Beach (New York)',
    marks: ['southern shore of Brooklyn, New York City', 'sand spit / barrier beach built by longshore drift', 'western end of the Rockaway\u2013Coney barrier chain', 'heavily urbanised resort & boardwalk district', 'geomorphology: beach ridge vs lagoon behind'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['coney island', 'coney island brooklyn']
  },
  {
    url: C('Southern_Hemisphere_LamAz.svg'),
    sec: 'World \u00b7 Globe Concepts', title: 'Southern Hemisphere \u2014 Lambert Azimuthal View',
    marks: ['lands south of the Equator (Antarctica, Australia; most of S America & southern Africa)', 'seasons reversed relative to the Northern Hemisphere', 'Coriolis deflects moving air LEFT \u2192 lows spin clockwise', 'Southern Westerlies belt (Roaring Forties) 40\u201360\u00b0S', 'stars: Southern Cross; polar cell & circumpolar vortex over Antarctica'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['southern hemisphere', 'hemisphere']
  },
  {
    url: C('National_parks_of_the_United_States_and_their_areas_(labelled).png'),
    sec: 'World \u00b7 Wildlife & Protected Areas', title: 'National Parks of the US \u2014 Labelled by Area',
    marks: ['Yellowstone 1872 = world\u2019s first national park', 'National Park Service established 1916 (Organic Act)', '63 parks, sizes labelled (ha)', 'model for IUCN Category II protected areas', 'parallel: India\u2019s national parks, tiger reserves & biosphere reserves'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA (derivative of NASA imagery)',
    topics: ['national park service', 'national parks of the united states', 'us national parks']
  },
  {
    url: C('Cuba_Bahia_de_Cochinos-en.svg'),
    sec: 'World \u00b7 Locator', title: 'Bay of Pigs (Bah\u00eda de Cochinos) \u2014 Cuba',
    marks: ['bay on Cuba\u2019s southern coast (Zapata Peninsula / Gulf of Cazones)', 'site of the failed 1961 US-backed invasion', 'swampy Zapata coastal plain \u2014 hindered the landing force', 'Caribbean locator: Cuba 145 km from Florida', 'label Havana and the US state of Florida'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['bay of pigs', 'bay of pigs invasion', 'bahia de cochinos', 'cuba']
  }
];

var SECTION = { 'India \u00b7 Maps': 1, 'India \u00b7 Geophysics': 1, 'India \u00b7 Climate': 1, 'World \u00b7 Geophysics': 1, 'World \u00b7 Geomorphology': 1, 'World \u00b7 Climate': 1, 'World \u00b7 Oceanography': 1, 'World \u00b7 Islands': 1, 'World \u00b7 Coastal Landforms': 1, 'World \u00b7 Globe Concepts': 1, 'World \u00b7 Wildlife & Protected Areas': 1, 'World \u00b7 Locator': 1 };

// ---- load geography topic names from topic-layers.json ----
var TOPIC_GEO_REGEX = /canal|glacier|volcan|river|plateau|desert|sea\b|\blake\b|strait|monsoon|cyclone|earthquake|island|mountain|range|coast|peninsula|gulf|bay\b|delta|tectonic|soil|climate|forest|national park|sanctuary|wildlife|wetland|drought|flood|tsunami|hurricane|typhoon|el ni\u00f1o|la ni\u00f1a|ocean|hemisphere|tropic|equator|atoll|reef|watershed|estuary|fjord|mangrove|coral|savanna|prairie|steppe|taiga|tundra|pampas/i;
var GEO_CORE = { 'siachen glacier': 1, 'mcmahon line': 1, 'line of actual control': 1, 'line of control': 1, 'doklam': 1, 'suez canal': 1, 'panama canal': 1, 'gir': 1, 'volcano': 1, 'mauna loa': 1, 'barren island': 1, 'el ni\u00f1o': 1, 'la ni\u00f1a': 1 };
var GEO_EXCLUDE = { 'operation flood': 1, 'battle of lake poyang': 1, 'pulakeshin ii': 1, 'basavanna': 1, 'helicopter': 1 };

var layerTopics = [];
var layers = fs.existsSync(LAYERS_FILE) ? JSON.parse(fs.readFileSync(LAYERS_FILE, 'utf8')) : {};
Object.keys(layers).forEach(function (k) {
  var name = (layers[k] && layers[k].name) || k;
  if (!TOPIC_GEO_REGEX.test(name) && !GEO_CORE[norm(name)]) return;
  if (GEO_EXCLUDE[norm(name)]) return;
  layerTopics.push({ name: name, n: norm(name) });
  // Also walk the mind-tree branches so geography-shaped items that live inside a
  // seed's lane (e.g. "Amazon River", "Gulf of Mexico") are visible to the pack.
  var L = layers[k];
  if (L && Array.isArray(L.branches)) {
    L.branches.forEach(function (lane) {
      if (!lane || !Array.isArray(lane.items)) return;
      lane.items.forEach(function (it) {
        var iname = (it && (it.name || it.title)) || '';
        if (!iname || (!TOPIC_GEO_REGEX.test(iname) && !GEO_CORE[norm(iname)])) return;
        if (GEO_EXCLUDE[norm(iname)]) return;
        layerTopics.push({ name: iname, n: norm(iname) });
      });
    });
  }
});

// ---- match topics -> figures ----
// Token-subset matching: a topic is covered when every token of a figure key
// appears in the topic name (order-insensitive), e.g. key "el nino" covers
// "El Ni\u00f1o\u2013Southern Oscillation", key "volcano" covers "Taal volcano".
function tokens(s) { return norm(String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).split(' ').filter(Boolean); }
function isSubset(a, b) { return a.every(function (x) { return b.indexOf(x) >= 0; }); }
var figureKeys = FIGURES.map(function (f) {
  return { fig: f, keys: (f.topics || []).map(tokens) };
});
var unmatched = [];
var seenUnmatched = {};
layerTopics.forEach(function (t) {
  var tn = tokens(t.name);
  var hit = figureKeys.some(function (fk) {
    return fk.keys.some(function (ks) { return isSubset(ks, tn); });
  });
  if (!hit && !seenUnmatched[norm(t.name)]) { seenUnmatched[norm(t.name)] = 1; unmatched.push(t.name); }
});

// ---- build pages ----
function marksHtml(marks) {
  if (!marks || !marks.length) return '';
  return '<div class="marks"><b>Mark in exam:</b><ul>' + marks.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
}

function pageFor(f) {
  var badge = f.auto ? '<div class="auto-badge">AUTO-SUGGESTED \u00b7 verify image &amp; labels before exam use</div>' : '';
  var imgs = '';
  if (f.cls === 'trio') {
    imgs = '<div class="fig-img img-em"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>';
  } else {
    imgs = '<div class="fig-img"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>';
  }
  return '<section class="page">' +
    '<div class="num">' + esc(f.sec) + '</div>' +
    '<div class="fig-title">' + esc(f.title) + '</div>' +
    badge + imgs + marksHtml(f.marks) +
    '<div class="fig-src">' + esc(f.src) + '</div>' +
    '</section>';
}

// ---- AUTO figure fill: discover a Commons figure for topics still unmatched ----
// Quality gates ("build with care"): search the Commons API, score candidates by how
// map-like the filename is, prefer svg > png > jpg, reject photo/subject pages, and
// adopt only files whose Special:FilePath redirect resolves. Picks are cached in
// data/geo-auto-figures.json (git-tracked via data/) so images stay stable between
// builds AND can be hand-overridden. Every auto page is badged in the pack.
var AUTO_CACHE_FILE = path.join(DATA, 'geo-auto-figures.json');
var AUTO_UA = 'dimsred-geo-figures/1.0 (https://github.com/renj-arch/dimsred; educational build)';
var AUTO_REJECT = /monument|museum|statue|memorial|selfie|portrait|headshot|palace|fort|flag|logo|emblem|coat of arms|coin|stamp|poster|postcard|painting|church|mosque|temple|bridg|rail|train|hotel|aircraft|shipping|\.pdf|\.djvu|\.ogg|\.ogv|\.webm|\.mid|_thumb/;
var AUTO_EXCLUDE_IMG = {};
function autoScore(titleRaw, topic) {
  var raw = String(titleRaw).toLowerCase();
  var t = norm(raw);
  var ext = /\.svg$/i.test(raw) ? 3 : (/\.png$/i.test(raw) ? 2 : (/\.jpe?g$/i.test(raw) ? 1.2 : (/\.gif$/i.test(raw) ? 0.8 : -10)));
  var hint = /map|locator|topograph|outline|projection/.test(t) ? 2 : (/relief|physical|political|location|orthograph|globe|continent|terrain|satellite|aerial/.test(t) ? 1 : 0);
  var bigNum = /[0-9]{4,}/.test(t) ? -1 : 0;
  var rel = 0;
  var tt = tokens(topic || '');
  if (tt.length) rel = tt.some(function (w) { return w.length > 2 && t.indexOf(w) !== -1; }) ? 2 : -3;
  return hint + ext + rel + (AUTO_REJECT.test(t) ? -4 : 0) + bigNum;
}
async function commonsSearch(q) {
  var url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=20&format=json&srsearch=' + encodeURIComponent(q);
  var r;
  try { r = await fetch(url, { headers: { 'User-Agent': AUTO_UA } }); } catch (e) { return []; }
  if (!r.ok) return [];
  var j = await r.json();
  return (j.query && j.query.search) ? j.query.search.map(function (s) { return s.title; }) : [];
}
async function fileOK(fname) {
  if (AUTO_EXCLUDE_IMG[fname]) return false;
  try {
    var r = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fname) + '?width=200', { redirect: 'manual' });
    return r.status === 302;
  } catch (e) { return false; }
}
async function resolveAuto(name) {
  var queries = [name + ' map', name + ' map filetype:drawing', name + ' location map', name + ' topographic map', name + ' locator map', name];
  for (var qi = 0; qi < queries.length; qi++) {
    var hits = await commonsSearch(queries[qi]);
    var best = null;
    var bestAny = null;
    hits.forEach(function (h) {
      var sc = autoScore(h, name);
      if (sc < 3) return;
      var fname = String(h).replace(/^File:/, '');
      if (sc >= 4 && (!best || best.s < sc)) best = { f: fname, s: sc, q: queries[qi] };
      if (!bestAny || bestAny.s < sc) bestAny = { f: fname, s: sc, q: queries[qi] };
    });
    // prefer a real map/locator (score >= 4); fall back to any relevant image (>= 3)
    var cand = best || bestAny;
    if (cand && (await fileOK(cand.f))) return cand;
    await new Promise(function (res) { setTimeout(res, 250); });
  }
  return null;
}
async function autoFill(unmatchedList) {
  var cache = {};
  if (fs.existsSync(AUTO_CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(AUTO_CACHE_FILE, 'utf8')); } catch (e) { cache = {}; }
  }
  var resolved = [];
  var still = [];
  var cap = Math.min(unmatchedList.length, 60); // bound build time; the rest wait for the next run
  for (var i = 0; i < cap; i++) {
    var key = norm(unmatchedList[i]);
    var fname = null;
    var via = 'cache';
    if (cache[key] && (await fileOK(cache[key]))) {
      fname = cache[key];
    } else {
      var hit = null;
      try { hit = await resolveAuto(unmatchedList[i]); } catch (e) { hit = null; }
      if (hit) { fname = hit.f; via = hit.q; }
      await new Promise(function (res) { setTimeout(res, 200); });
    }
    if (fname) {
      AUTO_EXCLUDE_IMG[fname] = 1;
      cache[key] = fname;
      resolved.push({ name: unmatchedList[i], file: fname, via: via });
    } else {
      still.push(unmatchedList[i]);
    }
  }
  for (var ti = cap; ti < unmatchedList.length; ti++) still.push(unmatchedList[ti]);
  if (Object.keys(cache).length) fs.writeFileSync(AUTO_CACHE_FILE, JSON.stringify(cache, null, 2));
  return { resolved: resolved, still: still };
}

async function main() {
  var curatedPages = FIGURES.map(pageFor);
  var fill = await autoFill(unmatched);
  var autoEntries = fill.resolved.map(function (x) {
    return {
      url: C(x.file),
      auto: true,
      sec: 'World \u00b7 Auto',
      title: x.name + ' \u2014 Suggested Figure',
      marks: ['locate / label this feature plus its surrounding countries & water bodies', 'state co-ordinates, hemisphere and climatic belt', 'verify the image really is the feature (auto-suggested)'],
      src: 'Source: auto-suggested from Wikimedia Commons \u00b7 CC BY-SA \u2014 verify before exam',
      topics: [norm(x.name)]
    };
  });
  var pages = curatedPages.concat(autoEntries.map(pageFor));

  var missingNote = '';
  if (fill.still.length) {
    missingNote = '<div class="missing"><b>Topics still needing a figure</b> (name could not be auto-matched \u2014 improve in scripts/build-geography-figures.js):<br>' +
      esc(fill.still.slice(0, 40).join(' \u00b7 ')) + (fill.still.length > 40 ? ' \u00b7 +' + (fill.still.length - 40) + ' more' : '') + '</div>';
  }

  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<title>GS Geography Figures (UPSC Mains)</title>' +
    '<style>' +
    'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;background:#e5e7eb;color:#111827}' +
    'section.page{background:#fff;max-width:980px;margin:16px auto;padding:26px 28px;box-shadow:0 1px 4px rgba(0,0,0,.18);page-break-after:always}' +
    'section.page:last-child{page-break-after:auto}' +
    'header h1{font-size:18px;margin:0 0 2px}' +
    '.num{font-size:10px;letter-spacing:.14em;color:#0e7490;font-weight:700;text-transform:uppercase}' +
    '.fig-title{font-size:15px;font-weight:700;margin:2px 0 6px}' +
    '.fig-src{font-size:9.5px;color:#6b7280;margin:6px 0 0}' +
    '.fig-img{display:flex;justify-content:center;align-items:center;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:8px 0}' +
    '.fig-img img{max-width:100%;height:auto}' +
    '.fig-img.img-em{flex-direction:column;gap:6px}' +
    '.auto-badge{background:#fffbeb;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:9px;letter-spacing:.08em;padding:3px 8px;display:inline-block;margin-bottom:6px;font-weight:700}' +
    '.marks{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:11px;line-height:1.7}' +
    '.marks b{color:#166534}.marks ul{margin:4px 0 0;padding-left:16px}.marks li{margin:1px 0}' +
    '.missing{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:9.5px;color:#92400e;line-height:1.6;margin-bottom:8px}' +
    '@page{size:A4;margin:10mm}' +
    '@media print{body{background:#fff}section.page{box-shadow:none;margin:0;padding:0}.fig-img{break-inside:avoid}}</style>' +
    '</head><body>' +
    '<section class="page"><header><span class="num">GS Paper 1 \u00b7 Geography \u00b7 UPSC Mains</span><h1>Geography Figures \u2014 Real Labelled Outlines</h1><p class="meta">' + (FIGURES.length + autoEntries.length) + ' figures (' + FIGURES.length + ' curated + ' + autoEntries.length + ' auto) \u00b7 live images from Wikimedia Commons & NOAA (needs internet) \u00b7 print-ready A4 \u00b7 auto-built by scripts/build-geography-figures.js</p></header>' + missingNote + '</section>' +
    pages.join('') +
    '</body></html>';

  fs.writeFileSync(OUT_FILE, html);
  console.log('Wrote ' + OUT_FILE + ' (' + (FIGURES.length + autoEntries.length) + ' figures = ' + FIGURES.length + ' curated + ' + autoEntries.length + ' auto)');
  console.log('Auto-resolved figures: ' + fill.resolved.length);
  fill.resolved.forEach(function (x) { console.log('  + ' + x.name + ' -> ' + x.file + (x.via !== 'cache' ? '  [via "' + x.via + '"]' : '  [cached]')); });
  console.log('Unmatched geography topics (no figure yet): ' + fill.still.length);
  fill.still.slice(0, 25).forEach(function (n) { console.log('  - ' + n); });
}

if (process.env.GEO_AUTO_DEMO) { unmatched = process.env.GEO_AUTO_DEMO.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
main().catch(function (e) { console.error(e); process.exit(1); });