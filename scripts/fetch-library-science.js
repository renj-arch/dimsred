var miner = require('./lib/wiki-miner-core.js');

function run() {
  miner.runMiner({
    idPrefix: 'lib',
    subject: 'Library & Information Science',
    outPath: 'data/questions/library-information-science.json',
    topics: {
      'Library Management': ['Library', 'Library management', 'Library science', 'Librarian', 'Special library', 'Public library', 'Academic library', 'Library history', 'School library'],
      'Classification': ['Library classification', 'Dewey Decimal Classification', 'Library of Congress Classification', 'Colon classification', 'Universal Decimal Classification', 'Faceted classification'],
      'Cataloguing': ['Cataloging', 'MARC standards', 'Dublin Core', 'International Standard Bibliographic Description', 'Library catalog', 'Authority control', 'Subject (documents)', 'Indexing and abstracting'],
      'Information Sources & Services': ['Reference work', 'Reference desk', 'Index (publishing)', 'Abstract (summary)', 'Bibliography', 'Encyclopedia', 'Bibliography Index', 'Information retrieval', 'Library reference desk'],
      'Information Systems & Digital Library': ['Digital library', 'Institutional repository', 'Open access', 'Library 2.0', 'Information system', 'Metadata', 'Content management system', 'Full-text search', 'Interlibrary loan', 'Online public access catalog'],
      'Resource Sharing & Networking': ['Library consortium', 'WorldCat', 'OCLC', 'Resource sharing', 'Library network', 'Z39.50', 'Information network'],
      'Computer & Library Automation': ['Library automation', 'Integrated library system', 'Barcode', 'Radio-frequency identification', 'Koha (software)', 'Library management system', 'OPAC', 'Web 2.0', 'Digitization']
    }
  });
}

module.exports = { run: run };
if (require.main === module) run();