// Auto-generate UPSC revision content from existing data
// Usage: node scripts/generate-revision-content.js

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data');
var TOPIC_LAYERS = path.join(DATA_DIR, 'topic-layers.json');
var TIMELINE = path.join(DATA_DIR, 'timeline.json');
var OUTPUT = path.join(DATA_DIR, 'revision-content.json');

// Load existing data
var topicLayers = JSON.parse(fs.readFileSync(TOPIC_LAYERS, 'utf8'));
var timeline = JSON.parse(fs.readFileSync(TIMELINE, 'utf8'));

var revisionContent = {};

// 1. Generate bullet-point summaries from topic-layers
function generateBullets(topicName, topicData) {
  var bullets = [];
  
  if (topicData.branches) {
    topicData.branches.forEach(function(branch) {
      if (branch.items) {
        branch.items.forEach(function(item) {
          // Extract key points from note field with better filtering
          if (item.note) {
            var sentences = item.note.split(/[.!?]+/).filter(function(s) {
              var clean = s.trim();
              // Filter for meaningful sentences (not too short, not quotes, not citations)
              return clean.length > 15 && clean.length < 180 && 
                     !clean.startsWith('"') && 
                     !clean.includes('—') &&
                     !clean.includes('==') &&
                     !clean.includes('http');
            });
            
            sentences.forEach(function(sentence) {
              var clean = sentence.trim();
              // Make it more concise for revision
              clean = clean.replace(/\s+/g, ' ') // Remove extra spaces
                         .replace(/\([^)]*\)/g, '') // Remove parenthetical content
                         .replace(/,.{0,30}$/, '') // Remove trailing clauses
                         .trim();
              
              if (clean.length > 20 && !bullets.includes(clean)) {
                bullets.push('• ' + clean.charAt(0).toUpperCase() + clean.slice(1));
              }
            });
          }
        });
      }
    });
  }
  
  // Remove duplicates and limit to top 6 most relevant bullets
  return bullets.filter(function(item, pos, self) {
    return self.indexOf(item) == pos;
  }).slice(0, 6);
}

// 2. Extract facts with numbers/dates - improved quality
function extractFacts(topicName, topicData) {
  var facts = [];
  
  // Better patterns for meaningful facts
  var yearPattern = /\b(1[4-9]\d{2}|20[0-2]\d)\b/g; // 1400-2029
  var statPattern = /\b(\d+\.?\d*)\s*(%|percent|million|billion|thousand|crore|lakh|people|years|km|km²|tonnes)\b/gi;
  
  function extractFromText(text) {
    if (!text) return;
    
    // Extract years with context
    var yearMatches = text.match(yearPattern);
    if (yearMatches) {
      yearMatches.forEach(function(year) {
        // Find the sentence containing this year
        var sentences = text.split(/[.!?]+/);
        sentences.forEach(function(sentence) {
          if (sentence.includes(year) && sentence.length < 200) {
            var clean = sentence.trim();
            // Extract just the key fact with the year
            if (clean.includes(year) && clean.length > 10 && clean.length < 100) {
              var fact = clean.replace(/\s+/g, ' ').substring(0, 80) + '...';
              if (!facts.some(function(f) { return f.includes(year); })) {
                facts.push('📅 ' + fact);
              }
            }
          }
        });
      });
    }
    
    // Extract statistics with context
    var statMatches = text.match(statPattern);
    if (statMatches) {
      statMatches.forEach(function(stat) {
        var sentences = text.split(/[.!?]+/);
        sentences.forEach(function(sentence) {
          if (sentence.includes(stat) && sentence.length < 150) {
            var clean = sentence.trim();
            if (clean.length > 15 && clean.length < 80) {
              var fact = clean.replace(/\s+/g, ' ');
              if (!facts.some(function(f) { return f.includes(stat.split(' ')[0]); })) {
                facts.push('📊 ' + fact);
              }
            }
          }
        });
      });
    }
  }
  
  if (topicData.branches) {
    topicData.branches.forEach(function(branch) {
      if (branch.items) {
        branch.items.forEach(function(item) {
          extractFromText(item.note);
          extractFromText(item.desc);
        });
      }
    });
  }
  
  // Remove duplicates and return top 5 facts
  return facts.filter(function(item, pos, self) {
    return self.indexOf(item) == pos;
  }).slice(0, 5);
}

// 3. Generate comparison table for similar topics - improved relevance
function generateComparisons(topicName) {
  var comparisons = [];
  
  // Better similarity detection: topics with common words in their names
  var topicWords = topicName.toLowerCase().split(/\s+/);
  var similarTopics = Object.keys(topicLayers).filter(function(name) {
    if (name === topicName) return false;
    
    var nameWords = name.toLowerCase().split(/\s+/);
    var commonWords = topicWords.filter(function(word) {
      return word.length > 3 && nameWords.includes(word);
    });
    
    return commonWords.length > 0;
  }).slice(0, 2); // Limit to 2 most similar
  
  if (similarTopics.length > 0) {
    var comparison = {
      title: 'Related Topics: ' + similarTopics.join(', '),
      table: []
    };
    
    similarTopics.forEach(function(similar) {
      var similarData = topicLayers[similar];
      var keyPoint = 'Related topic';
      
      // Try to extract a meaningful description
      if (similarData.branches && similarData.branches[0]) {
        if (similarData.branches[0].desc) {
          keyPoint = similarData.branches[0].desc.substring(0, 50) + '...';
        } else if (similarData.branches[0].title) {
          keyPoint = similarData.branches[0].title;
        }
      }
      
      comparison.table.push({
        topic: similar,
        keyPoint: keyPoint
      });
    });
    
    comparisons.push(comparison);
  }
  
  return comparisons;
}

// 4. Generate quick summary (2-3 sentence overview)
function generateSummary(topicName, topicData) {
  var summaryPoints = [];
  
  if (topicData.branches && topicData.branches.length > 0) {
    // Take one key point from each major branch
    topicData.branches.slice(0, 3).forEach(function(branch) {
      if (branch.desc && branch.desc.length < 150) {
        summaryPoints.push(branch.desc);
      } else if (branch.items && branch.items.length > 0) {
        var firstItem = branch.items[0];
        if (firstItem.desc && firstItem.desc.length < 150) {
          summaryPoints.push(firstItem.desc);
        }
      }
    });
  }
  
  return summaryPoints.slice(0, 2).join(' ');
}

// Process all topics
Object.keys(topicLayers).forEach(function(topicName) {
  var topicData = topicLayers[topicName];
  
  revisionContent[topicName] = {
    summary: generateSummary(topicName, topicData),
    bullets: generateBullets(topicName, topicData),
    facts: extractFacts(topicName, topicData),
    comparisons: generateComparisons(topicName),
    generatedAt: new Date().toISOString()
  };
});

// Save revision content
fs.writeFileSync(OUTPUT, JSON.stringify(revisionContent, null, 2));
console.log('Generated revision content for ' + Object.keys(revisionContent).length + ' topics');
console.log('Saved to: ' + OUTPUT);