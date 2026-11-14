const fs = require('fs');
const t = JSON.parse(fs.readFileSync('data/topic-layers.json', 'utf8'));

const ghandi = {
  "name": "Mahatma Gandhi",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Life",
      "type": "person",
      "rel": "life of",
      "desc": "Mohandas Karamchand Gandhi (1869-1948), Indian independence leader.",
      "items": [
        {"name": "Birth (Porbandar, 1869)", "type": "event", "desc": "Born 2 Oct 1869 in Porbandar, Gujarat."},
        {"name": "South Africa (1893-1914)", "type": "place", "desc": "Practiced law; developed satyagraha."},
        {"name": "Champaran (1917)", "type": "event", "desc": "First satyagraha — fought indigo-planters."},
        {"name": "Death (30 Jan 1948)", "type": "event", "desc": "Assassinated by Nathuram Godse at Birla House, Delhi."}
      ]
    },
    {
      "title": "Movements",
      "type": "event",
      "rel": "led",
      "desc": "Campaigns led by Gandhi.",
      "items": [
        {"name": "Non-cooperation (1920-22)", "type": "event", "desc": "Boycott; withdrawn after Chauri Chaura 1922."},
        {"name": "Salt March / Civil Disobedience (1930)", "type": "event", "desc": "Dandi March; broke salt laws; Poona Pact."},
        {"name": "Quit India (1942)", "type": "event", "desc": "'Do or Die'; arrested."}
      ]
    },
    {
      "title": "Associates",
      "type": "person",
      "rel": "colleague",
      "desc": "Key colleagues.",
      "items": [
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "First PM."},
        {"name": "Sardar Vallabhbhai Patel", "type": "person", "desc": "First Deputy PM."},
        {"name": "Rabindranath Tagore", "type": "person", "desc": "Awarded 'Mahatma' title."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "connected",
      "desc": "Key places.",
      "items": [
        {"name": "Sabarmati Ashram", "type": "place", "desc": "Founded 1917."},
        {"name": "South Africa", "type": "place", "desc": "21 years."},
        {"name": "Champaran (Bihar)", "type": "place", "desc": "First satyagraha."}
      ]
    }
  ]
};
t['mahatma gandhi'] = ghandi;

const champaran = {
  "name": "Champaran Satyagraha",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "First satyagraha of Gandhi in India, 1917.",
      "items": [
        {"name": "Indigo planters' abuse (1917)", "type": "event", "desc": "Tinkathia system."},
        {"name": "Gandhi arrival (Apr 1917)", "type": "event", "desc": "Called by Rajkumar Shukla."},
        {"name": "Satyagraha (1917)", "type": "event", "desc": "Refused to leave."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "involved",
      "desc": "Key people.",
      "items": [
        {"name": "Rajkumar Shukla", "type": "person", "desc": "Invited Gandhi."},
        {"name": "Gandhi", "type": "person", "desc": "Led first Indian satyagraha."}
      ]
    },
    {
      "title": "Outcome",
      "type": "concept",
      "rel": "result",
      "desc": "Results.",
      "items": [
        {"name": "Champaran Agrarian Act (1918)", "type": "event", "desc": "Legislative relief."},
        {"name": "First Indian satyagraha", "type": "concept", "desc": "Established Gandhi's method."}
      ]
    }
  ]
};
t['champaran satyagraha'] = champaran;

fs.writeFileSync('data/topic-layers.json', JSON.stringify(t, null, 1));
console.log('Fixed Gandhi, Champaran + preserved', Object.keys(t).length, 'topics');
console.log('Authored:', Object.values(t).filter(x => !x._gen).length);