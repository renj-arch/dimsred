const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

const STATIC = {
  'wiki-biome.json': [
    {n:'Tropical Rainforest',la:0,ln:60,sub:'Equatorial regions',desc:'Warm, wet all year. Amazon, Congo, SE Asia. Most biodiverse biome.',fact:'25°C+ year-round · 2,000mm+ rain · Amazon, Congo, SE Asia · Dense canopy',_cat:'biome',_quality:'good'},
    {n:'Tropical Dry Forest',la:-15,ln:-50,sub:'Seasonal tropics',desc:'Distinct wet/dry seasons. India, Africa, S America. Deciduous trees.',fact:'Wet/dry seasons · India, Africa · Deciduous · Monsoon',_cat:'biome',_quality:'good'},
    {n:'Tropical Savanna',la:10,ln:10,sub:'Tropical grasslands',desc:'Grassland with scattered trees. Serengeti. Acacias. Large herbivores.',fact:'Grassland + trees · Serengeti · Acacias · Wildebeest migration',_cat:'biome',_quality:'good'},
    {n:'Desert',la:25,ln:10,sub:'Arid regions',desc:'Under 250mm rain/year. Sahara, Thar, Atacama. Extreme temperatures.',fact:'250mm rain · Sahara, Atacama · Extreme temps · Cacti, succulents',_cat:'biome',_quality:'good'},
    {n:'Mediterranean',la:35,ln:10,sub:'Mediterranean climate zones',desc:'Mild wet winters, hot dry summers. Mediterranean, California, Cape Town.',fact:'Mild wet winters · Hot dry summers · Chaparral · Fires',_cat:'biome',_quality:'good'},
    {n:'Temperate Grassland',la:45,ln:-100,sub:'Prairies, steppes',desc:'Fertile soil, moderate rain. American prairies, Eurasian steppes. Wheat belt.',fact:'Prairies, steppes · Fertile soil · Grain basket · Moderate rain',_cat:'biome',_quality:'good'},
    {n:'Temperate Forest',la:45,ln:10,sub:'Mid-latitude forests',desc:'Deciduous + mixed forests. Europe, E USA, E Asia. Four distinct seasons.',fact:'Deciduous · 4 seasons · Europe, E USA · Oak, maple, beech',_cat:'biome',_quality:'good'},
    {n:'Boreal Forest (Taiga)',la:55,ln:80,sub:'Subarctic conifer belt',desc:'World\'s largest terrestrial biome. Conifers. Canada, Russia, Scandinavia.',fact:'Taiga · Largest biome · Conifers · Canada, Russia · Cold, long winters',_cat:'biome',_quality:'good'},
    {n:'Tundra',la:70,ln:0,sub:'Arctic & alpine regions',desc:'Cold, treeless. Permafrost. Mosses, lichens. Arctic, alpine peaks.',fact:'Treeless · Permafrost · Arctic, alpine · Mosses, lichens · Short summer',_cat:'biome',_quality:'good'},
    {n:'Mangrove Forest',la:10,ln:80,sub:'Tropical coastlines',desc:'Salt-tolerant trees in intertidal zones. Sundarbans, Florida, SE Asia.',fact:'Salt-tolerant · Intertidal · Sundarbans, Florida · Coastal protection',_cat:'biome',_quality:'good'},
    {n:'Montane Forest',la:30,ln:80,sub:'Mountain regions',desc:'Altitude-based vegetation zones. Himalayas, Andes. Cloud forests.',fact:'Altitude zones · Himalayas, Andes · Cloud forest · Conifers at high alt',_cat:'biome',_quality:'good'},
  ],
  'wiki-climate_zone.json': [
    {n:'Tropical Rainforest (Af)',la:0,ln:0,sub:'Köppen Af',desc:'Year-round rain, avg temp >18°C. Amazon, Congo, Indonesia.',fact:'>18°C year-round · Amazon, Congo, Indonesia · Dense rainforest',_cat:'climate_zone',_quality:'good'},
    {n:'Tropical Monsoon (Am)',la:15,ln:75,sub:'Köppen Am',desc:'Short dry season, heavy monsoon rains. India, SE Asia, W Africa.',fact:'Short dry season · Monsoon heavy · India, SE Asia · W African coast',_cat:'climate_zone',_quality:'good'},
    {n:'Tropical Savanna (Aw)',la:15,ln:-15,sub:'Köppen Aw',desc:'Distinct wet/dry seasons. Savanna grasslands. African Serengeti.',fact:'Wet/dry · Savanna · Serengeti · Acacia · African grasslands',_cat:'climate_zone',_quality:'good'},
    {n:'Arid Desert (BWh/BWk)',la:25,ln:20,sub:'Köppen B',desc:'Under 250mm annual rain. Sahara, Arabian, Thar, Atacama, Gobi.',fact:'250mm rain · Sahara, Atacama, Gobi · Extreme heat · Cold nights',_cat:'climate_zone',_quality:'good'},
    {n:'Semi-Arid Steppe (BSh/BSk)',la:30,ln:70,sub:'Köppen BS',desc:'Marginal rainfall. US Great Plains, Sahel, Central Asia.',fact:'Marginal rain · Great Plains, Sahel, Central Asia · Grassland',_cat:'climate_zone',_quality:'good'},
    {n:'Mediterranean (Csa/Csb)',la:35,ln:15,sub:'Köppen C',desc:'Mild wet winters, hot dry summers. Mediterranean, California, Chile.',fact:'Wet mild winters · Hot dry summers · Mediterranean, California, SW Australia',_cat:'climate_zone',_quality:'good'},
    {n:'Humid Subtropical (Cfa/Cwa)',la:30,ln:85,sub:'Köppen C',desc:'Hot humid summers, mild winters. SE USA, E China, Japan, Argentina.',fact:'Hot humid summer · SE USA, E China, Japan · Mild winter',_cat:'climate_zone',_quality:'good'},
    {n:'Oceanic (Cfb/Cfc)',la:50,ln:10,sub:'Köppen C',desc:'Mild summers, cool winters, year-round rain. NW Europe, NZ, Chile.',fact:'Mild summer · Cool winter · Year-round rain · NW Europe, NZ, Chile',_cat:'climate_zone',_quality:'good'},
    {n:'Humid Continental (Dfa/Dfb)',la:45,ln:-90,sub:'Köppen D',desc:'Warm summers, cold winters. NE USA, Canada, Russia, Scandinavia.',fact:'Warm summer · Cold winter · Snow · NE USA, Canada, Russia',_cat:'climate_zone',_quality:'good'},
    {n:'Subarctic (Dfc/Dfd)',la:60,ln:-100,sub:'Köppen D',desc:'Short mild summers, long cold winters. Siberia, Canada, Alaska.',fact:'Short mild summer · Long cold winter · Siberia, Canada, Alaska · Taiga',_cat:'climate_zone',_quality:'good'},
    {n:'Tundra (ET)',la:75,ln:0,sub:'Köppen E',desc:'Warmest month 0-10°C. Treeless. Arctic coast, Himalayan peaks.',fact:'0-10°C warmest · Treeless · Arctic, Himalayan peaks · Permafrost',_cat:'climate_zone',_quality:'good'},
    {n:'Ice Cap (EF)',la:-80,ln:0,sub:'Köppen E',desc:'Warmest month <0°C. Permanent ice. Antarctica, Greenland interior.',fact:'<0°C year-round · Antarctica, Greenland · Permanent ice · No life',_cat:'climate_zone',_quality:'good'},
    {n:'Highland (H)',la:30,ln:85,sub:'Köppen H',desc:'Altitude-dependent climate. Himalayas, Andes, Ethiopian Highlands.',fact:'Altitude dependent · Himalayas, Andes, Ethiopia · Variable zones',_cat:'climate_zone',_quality:'good'},
  ],
  'wiki-cyclone_region.json': [
    {n:'Bay of Bengal Cyclones',la:15,ln:88,sub:'Bay of Bengal',desc:'Most active cyclone basin by fatalities. Warm waters feed cyclones. India, Bangladesh, Myanmar.',fact:'Warm Bay of Bengal · 5-6 cyclones/year · India, Bangladesh · Most deadly',_cat:'cyclone_region',_quality:'good'},
    {n:'Arabian Sea Cyclones',la:18,ln:68,sub:'Arabian Sea',desc:'Fewer but intense cyclones. Gujarat, Oman, Yemen. Cyclone Tauktae (2021).',fact:'Less active than BoB · Intense when form · Gujarat, Oman · Tauktae 2021',_cat:'cyclone_region',_quality:'good'},
    {n:'North Atlantic Hurricanes',la:25,ln:-75,sub:'Atlantic',desc:'June-November season. Caribbean, US East Coast, Gulf of Mexico. Category 1-5 Saffir-Simpson.',fact:'June-November · Caribbean, US Gulf · Cat 1-5 Saffir-Simpson · Katrina, Harvey',_cat:'cyclone_region',_quality:'good'},
    {n:'NW Pacific Typhoons',la:20,ln:130,sub:'NW Pacific',desc:'Most active basin. 25-30 storms/year. Japan, Philippines, China, Taiwan. Super typhoons.',fact:'Most active · 25-30/year · Philippines, Japan, China · Super typhoon',_cat:'cyclone_region',_quality:'good'},
    {n:'South Pacific Cyclones',la:-20,ln:160,sub:'South Pacific',desc:'November-April season. Fiji, Vanuatu, Australia (Queensland). Warm Coral Sea.',fact:'November-April · Fiji, Vanuatu, Queensland · Coral Sea · Category 5',_cat:'cyclone_region',_quality:'good'},
    {n:'SW Indian Ocean Cyclones',la:-20,ln:60,sub:'SW Indian Ocean',desc:'November-April. Madagascar, Mozambique, Mauritius, Réunion.',fact:'November-April · Madagascar, Mozambique · Mauritius, Réunion · IDAI',_cat:'cyclone_region',_quality:'good'},
  ],
  'wiki-tornado_region.json': [
    {n:'Tornado Alley (USA)',la:37,ln:-98,sub:'Central USA',desc:'World\'s most active tornado region. Texas to Nebraska to Iowa. Peak May-June. 1,000+ tornadoes/year.',fact:'1,000+/year · Texas to Nebraska · May-June peak · F5/EF5 possible',_cat:'tornado_region',_quality:'good'},
    {n:'Dixie Alley (SE USA)',la:33,ln:-88,sub:'SE United States',desc:'Tornado-prone SE USA. Mississippi, Alabama, Georgia, Tennessee. Night tornadoes, less warning.',fact:'SE USA · Night tornadoes · Less warning · Mississippi, Alabama, Georgia',_cat:'tornado_region',_quality:'good'},
    {n:'Canada Tornadoes',la:50,ln:-100,sub:'Southern Canada',desc:'Southern Ontario, Prairies (Saskatchewan, Alberta). 60-80/year. Less intense than US.',fact:'60-80/year · Ontario, Prairies · Less intense · EF2 average max',_cat:'tornado_region',_quality:'good'},
    {n:'Bangladesh Tornadoes',la:24,ln:90,sub:'Ganges Delta',desc:'Deadly tornadoes due to high population density. April peak. Daulatpur-Saturia (1989) deadliest.',fact:'High fatality rate · April peak · Daulatpur-Saturia 1989 deadliest · Dense population',_cat:'tornado_region',_quality:'good'},
    {n:'Argentina/Uruguay Tornadoes',la:-33,ln:-60,sub:'Pampas region',desc:'South America\'s tornado region. SE South America. Spring/summer storms. Strong tornadoes possible.',fact:'SE South America · Spring/summer · Strong tornadoes · Pampas region',_cat:'tornado_region',_quality:'good'},
    {n:'Europe Tornadoes',la:50,ln:10,sub:'Central Europe',desc:'Less frequent, weaker. UK, Germany, France, Italy. 300-400/year mostly F0-F1.',fact:'300-400/year · UK, Germany, France · Mostly F0-F1 · Weak but damages',_cat:'tornado_region',_quality:'good'},
    {n:'Australia Tornadoes',la:-28,ln:145,sub:'Eastern Australia',desc:'NSW, Queensland. Spring/summer. Rare but can be strong. Associated with east coast lows.',fact:'NSW, Queensland · Spring/summer · East coast lows · Rare but strong',_cat:'tornado_region',_quality:'good'},
  ],
  'wiki-time_zone.json': [
    {n:'UTC±0',la:51.48,ln:0.0,sub:'Prime Meridian · Greenwich, London',desc:'Coordinated Universal Time. Prime Meridian (0°). Greenwich Mean Time. Iceland, W Africa.',fact:'Prime Meridian · Greenwich · Iceland, UK, Portugal, W Africa',_cat:'time_zone',_quality:'good'},
    {n:'UTC+1',la:48.85,ln:2.33,sub:'Central European Time',desc:'France, Germany, Italy, Spain, Norway, Sweden, W Central Africa.',fact:'France, Germany, Italy · CET · W Central Africa',_cat:'time_zone',_quality:'good'},
    {n:'UTC+2',la:37.98,ln:23.72,sub:'Eastern European Time',desc:'Greece, Turkey, Finland, Romania, Ukraine, Israel, Egypt, Libya.',fact:'Greece, Turkey, Finland · EET · Israel, Egypt, Libya',_cat:'time_zone',_quality:'good'},
    {n:'UTC+3',la:55.75,ln:37.62,sub:'Moscow Time',desc:'Russia west, Belarus, Saudi Arabia, Iraq, Kenya, Madagascar, Ethiopia.',fact:'Moscow, Belarus, Saudi Arabia, Iraq, Kenya, Madagascar',_cat:'time_zone',_quality:'good'},
    {n:'UTC+4',la:40.37,ln:49.85,sub:'Gulf Standard Time',desc:'UAE, Oman, Azerbaijan, Georgia, Armenia, Mauritius, Seychelles.',fact:'UAE, Oman, Azerbaijan · GST · Mauritius, Seychelles',_cat:'time_zone',_quality:'good'},
    {n:'UTC+5',la:23.79,ln:77.20,sub:'Indian Standard Time',desc:'India, Sri Lanka. IST = UTC+5:30. 82.5°E standard meridian. Single time zone for whole India.',fact:'India, Sri Lanka · UTC+5:30 · 82.5°E · Single zone · 2.3B people',_cat:'time_zone',_quality:'good'},
    {n:'UTC+6',la:23.81,ln:90.41,sub:'Bangladesh Time',desc:'Bangladesh, Bhutan, Kazakhstan east. Novosibirsk.',fact:'Bangladesh, Bhutan · BST · Kazakhstan east',_cat:'time_zone',_quality:'good'},
    {n:'UTC+7',la:13.72,ln:100.52,sub:'Indochina Time',desc:'Thailand, Vietnam, Laos, Cambodia, Indonesia west, Siberia west.',fact:'Thailand, Vietnam, Laos, Cambodia, W Indonesia, W Siberia',_cat:'time_zone',_quality:'good'},
    {n:'UTC+8',la:39.91,ln:116.39,sub:'China Standard Time',desc:'China (single zone), Singapore, Malaysia, Philippines, Australia west, Taiwan.',fact:'China single zone · Singapore, Malaysia, Philippines, Taiwan, W Australia',_cat:'time_zone',_quality:'good'},
    {n:'UTC+9',la:35.68,ln:139.75,sub:'Japan Standard Time',desc:'Japan, South Korea, East Timor, Indonesia east. Palau.',fact:'Japan, South Korea · JST · East Timor, E Indonesia',_cat:'time_zone',_quality:'good'},
    {n:'UTC+10',la:-33.87,ln:151.21,sub:'Australian Eastern Time',desc:'Sydney, Melbourne, Brisbane, Canberra. Papua New Guinea, Guam, Vladivostok.',fact:'E Australia · Sydney, Melbourne · PNG, Guam, Vladivostok',_cat:'time_zone',_quality:'good'},
    {n:'UTC+11',la:-9.44,ln:159.96,sub:'Solomon Islands Time',desc:'Solomon Islands, Vanuatu, New Caledonia, Sakhalin (Russia).',fact:'Solomon Islands, Vanuatu, New Caledonia, Sakhalin',_cat:'time_zone',_quality:'good'},
    {n:'UTC+12',la:-41.28,ln:174.78,sub:'New Zealand Standard Time',desc:'New Zealand, Fiji, Russia Kamchatka. Wake Island.',fact:'New Zealand, Fiji, Kamchatka · NZST',_cat:'time_zone',_quality:'good'},
    {n:'UTC-1',la:31.99,ln:-23.93,sub:'Azores Time',desc:'Azores (Portugal), Cape Verde. Easternmost Atlantic.',fact:'Azores, Cape Verde · E Atlantic',_cat:'time_zone',_quality:'good'},
    {n:'UTC-2',la:-3.86,ln:-32.43,sub:'Fernando de Noronha Time',desc:'Fernando de Noronha (Brazil), South Georgia, S Sandwich Is.',fact:'Fernando de Noronha · S Georgia · Mid-Atlantic',_cat:'time_zone',_quality:'good'},
    {n:'UTC-3',la:-23.55,ln:-46.63,sub:'Brasília Time',desc:'Brasília, Buenos Aires, Santiago. Most of Brazil, Argentina, Uruguay.',fact:'Brasília, Buenos Aires, Santiago · E Brazil, Argentina, Uruguay',_cat:'time_zone',_quality:'good'},
    {n:'UTC-4',la:-33.45,ln:-70.66,sub:'Chile Standard Time',desc:'Chile, Bolivia, Paraguay, Venezuela, Atlantic Canada, Amazonas (Brazil).',fact:'Chile, Bolivia, Venezuela, Paraguay, Atlantic Canada',_cat:'time_zone',_quality:'good'},
    {n:'UTC-5',la:40.71,ln:-74.01,sub:'Eastern Standard Time',desc:'New York, Washington, Toronto, Havana, Bogota, Lima, Panama, Jamaica.',fact:'New York, Toronto, Washington · EST · Havana, Bogota, Lima, Panama',_cat:'time_zone',_quality:'good'},
    {n:'UTC-6',la:41.88,ln:-87.63,sub:'Central Standard Time',desc:'Chicago, Mexico City, Dallas, Winnipeg, Guatemala, Tegucigalpa.',fact:'Chicago, Mexico City, Dallas · CST · Guatemala, Honduras',_cat:'time_zone',_quality:'good'},
    {n:'UTC-7',la:39.74,ln:-104.99,sub:'Mountain Standard Time',desc:'Denver, Phoenix, Calgary, Salt Lake City. Edmonton, Chihuahua.',fact:'Denver, Phoenix, Calgary · MST · Rocky Mountains',_cat:'time_zone',_quality:'good'},
    {n:'UTC-8',la:34.05,ln:-118.24,sub:'Pacific Standard Time',desc:'Los Angeles, San Francisco, Vancouver, Seattle, Tijuana.',fact:'Los Angeles, SF, Vancouver, Seattle, Tijuana · PST',_cat:'time_zone',_quality:'good'},
    {n:'UTC-9',la:58.30,ln:-134.42,sub:'Alaska Standard Time',desc:'Anchorage, Juneau. Most of Alaska. Gambier Islands (French Polynesia).',fact:'Alaska · Anchorage, Juneau · AKST · Gambier Islands',_cat:'time_zone',_quality:'good'},
    {n:'UTC-10',la:21.32,ln:-157.83,sub:'Hawaii Standard Time',desc:'Hawaii, Tahiti, Cook Islands. Aleutian Islands.',fact:'Hawaii, Tahiti, Cook Islands · HST',_cat:'time_zone',_quality:'good'},
    {n:'UTC-11',la:-19.06,ln:-169.92,sub:'Samoa Time',desc:'American Samoa, Niue, Midway Atoll.',fact:'American Samoa, Niue, Midway · SST',_cat:'time_zone',_quality:'good'},
    {n:'UTC-12',la:0.0,ln:-180.0,sub:'International Date Line',desc:'Baker Island, Howland Island (uninhabited US territories). IDL west.',fact:'Baker Island, Howland Island · Uninhabited · IDL',_cat:'time_zone',_quality:'good'},
  ],
};

fs.mkdirSync(DATA_DIR, { recursive: true });
let total = 0;
for (const [file, entries] of Object.entries(STATIC)) {
  const fp = path.join(DATA_DIR, file);
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`${file}: ${entries.length} entries`);
  total += entries.length;
}
console.log(`\nTotal: ${total} entries across ${Object.keys(STATIC).length} files`);
