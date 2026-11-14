var miner = require('./lib/wiki-miner-core.js');

function run() {
  miner.runMiner({
    idPrefix: 'hydro',
    subject: 'Geology & Hydrogeology',
    outPath: 'data/questions/geology-hydrogeology.json',
    topics: {
      'Physical & Structural Geology': ['Geology', 'Structural geology', 'Plate tectonics', 'Rock (geology)', 'Igneous rock', 'Sedimentary rock', 'Metamorphic rock', 'Fault (geology)', 'Fold (geology)', 'Stratigraphy', 'Geological time scale'],
      'Mineralogy & Petrology': ['Mineralogy', 'Petrology', 'Mineral', 'Crystal structure', 'Silicate minerals', 'Igneous petrology', 'Sedimentology', 'Metamorphic petrology', 'Mohs scale of mineral hardness'],
      'Geomorphology': ['Geomorphology', 'Landform', 'Erosion', 'Weathering', 'River erosion', 'Glacial landform', 'Coastal geography', 'Karst'],
      'Paleontology & Economic Geology': ['Paleontology', 'Fossil', 'Geological period', 'Ore', 'Mineral resource', 'Coal', 'Petroleum', 'Mining'],
      'Applied Geology & GIS': ['Remote sensing', 'Geographic information system', 'Engineering geology', 'Environmental geology', 'Geodesy', 'Cartography'],
      'Hydrogeology': ['Hydrogeology', 'Aquifer', 'Groundwater', 'Water table', 'Hydraulic conductivity', 'Porosity', 'Specific yield', 'Artesian well', 'Confined aquifer', 'Unconfined aquifer'],
      'Groundwater Exploration & Management': ['Groundwater exploration', 'Water well', 'Aquifer test', 'Theis equation', 'Overdrafting', 'Groundwater recharge', 'Groundwater pollution', 'Water quality', 'Saline intrusion']
    }
  });
}

module.exports = { run: run };
if (require.main === module) run();