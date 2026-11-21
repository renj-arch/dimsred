var miner = require('./lib/wiki-miner-core.js');

function run() {
  miner.runMiner({
    idPrefix: 'eng',
    subject: 'Engineering & Technical',
    outPath: 'data/questions/engineering-technical.json',
    topics: {
      'Mathematics & Physics': ['Mathematics', 'Applied mathematics', 'Physics', 'Applied physics', 'Classical mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Fluid mechanics', 'Electricity', 'Statics', 'Dynamics (mechanics)'],
      'Chemistry & Industrial Chemistry': ['Chemistry', 'Applied chemistry', 'Industrial chemistry', 'Chemical reaction', 'Chemical engineering', 'Materials science', 'Polymer', 'Corrosion'],
      'Civil & Surveying': ['Civil engineering', 'Surveying', 'Construction', 'Concrete', 'Structural engineering', 'Building science', 'Soil mechanics', 'Topographic map', 'Level (instrument)'],
      'Electrical & Electronics': ['Electrical engineering', 'Electronics', 'Instrumentation', 'Electronic circuit', 'Transistor', 'Diode', 'Electrical network', 'Digital electronics', 'Integrated circuit', 'Microcontroller', 'Power electronics'],
      'Mechanical & Workshop': ['Mechanical engineering', 'Machine', 'Machine tool', 'Welding', 'Lathe', 'Milling (machining)', 'Drilling', 'Metalworking', 'Manufacturing', 'Workshop', 'Engineering drawing', 'Technical drawing', 'Fastener', 'Fitter and turner'],
      'Computer & Digital Skills': ['Computer', 'Digital literacy', 'Personal computer', 'Word processor', 'Spreadsheet', 'Presentation program', 'Internet', 'Email', 'Operating system', 'File Explorer'],
      'Environmental & Energy': ['Renewable energy', 'Solar energy', 'Wind power', 'Bioenergy', 'Environmental engineering', 'Sustainable energy', 'Energy conversion']
    }
  });
}

module.exports = { run: run };
if (require.main === module) run();