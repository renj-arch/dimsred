const fs = require('fs');
const path = require('path');

var chapters = [];

function q(id, text, topic, opts, sol) {
  return { id:id, text:text, topic:topic, opts:opts, sol:sol };
}
function op(l, t, c) { return { l:l, t:t, c:c }; }

// Chapter 3: Plant Kingdom
chapters.push({ num:3, name:'Plant Kingdom', slug:'plant-kingdom', topics:'Algae, Bryophytes, Pteridophytes, Gymnosperms',
  desc:'30 NEET-level MCQs on Plant Kingdom covering algae, bryophytes, pteridophytes, gymnosperms, angiosperms, and plant life cycles.',
  qs:[
    q(1,'Which is the correct sequence of algal divisions based on pigment?','Algae',[op('A','Chlorophyceae-Phaeophyceae-Rhodophyceae',true),op('B','Phaeophyceae-Chlorophyceae-Rhodophyceae'),op('C','Rhodophyceae-Phaeophyceae-Chlorophyceae'),op('D','Chlorophyceae-Rhodophyceae-Phaeophyceae')],'Chlorophyceae (green), Phaeophyceae (brown), Rhodophyceae (red) based on pigment composition.'),
    q(2,'Which pigment gives brown algae their color?','Algae',[op('A','Phycoerythrin'),op('B','Fucoxanthin',true),op('C','Phycocyanin'),op('D','Chlorophyll b')],'Fucoxanthin is the brown pigment in Phaeophyceae that masks chlorophyll.'),
    q(3,'Which group is called amphibians of the plant kingdom?','Bryophytes',[op('A','Algae'),op('B','Bryophytes',true),op('C','Pteridophytes'),op('D','Gymnosperms')],'Bryophytes need water for fertilization and live in moist habitats, hence called amphibians of the plant kingdom.'),
    q(4,'The dominant phase in bryophytes is:','Bryophytes',[op('A','Sporophyte'),op('B','Gametophyte',true),op('C','Sporangium'),op('D','Protonema')],'Gametophyte is dominant and independent in bryophytes; sporophyte depends on it.'),
    q(5,'Pteridophytes differ from bryophytes in having:','Pteridophytes',[op('A','Archegonia'),op('B','Vascular tissues',true),op('C','Multicellular sex organs'),op('D','Embryo formation')],'Pteridophytes have true vascular tissues (xylem, phloem), unlike bryophytes.'),
    q(6,'The megasporangium in gymnosperms is called:','Gymnosperms',[op('A','Archegonium'),op('B','Ovule',true),op('C','Embryo sac'),op('D','Pollen grain')],'The megasporangium in gymnosperms is the ovule containing the nucellus.'),
    q(7,'Which is a living fossil?','Gymnosperms',[op('A','Pinus'),op('B','Cycas',true),op('C','Cedrus'),op('D','Abies')],'Cycas is a living fossil that has remained unchanged for millions of years.'),
    q(8,'Double fertilization is characteristic of:','Angiosperms',[op('A','Gymnosperms'),op('B','Angiosperms',true),op('C','Pteridophytes'),op('D','Bryophytes')],'Double fertilization is unique to angiosperms: one sperm + egg = zygote, other + polar nuclei = endosperm.'),
    q(9,'Characteristic of angiosperms:','Angiosperms',[op('A','Naked seeds'),op('B','Seeds in fruits',true),op('C','No vascular tissues'),op('D','No flowers')],'Angiosperms have seeds enclosed in fruits and produce flowers.'),
    q(10,'Male gametophyte in angiosperms is:','Angiosperms',[op('A','Anther'),op('B','Pollen grain',true),op('C','Stamen'),op('D','Microsporangium')],'Pollen grain is the male gametophyte, developing from microspores in the anther.'),
    q(11,'Green algae belong to:','Algae',[op('A','Chlorophyceae',true),op('B','Phaeophyceae'),op('C','Rhodophyceae'),op('D','Bacillariophyceae')],'Chlorophyceae have chlorophyll a and b, giving them a green color.'),
    q(12,'Reserve food in brown algae:','Algae',[op('A','Starch'),op('B','Laminarin',true),op('C','Floridean starch'),op('D','Glycogen')],'Brown algae store laminarin; red algae store floridean starch.'),
    q(13,'Bryophyte plant body is:','Bryophytes',[op('A','Differentiated'),op('B','Thalloid or leafy',true),op('C','Vascular'),op('D','Microscopic')],'Bryophytes are thalloid or leafy, lacking true roots, stems, and leaves.'),
    q(14,'Peat moss is:','Bryophytes',[op('A','Marchantia'),op('B','Funaria'),op('C','Sphagnum',true),op('D','Polytrichum')],'Sphagnum is peat moss, with high water-holding capacity, used as packing material.'),
    q(15,'Sporangia in pteridophytes are on:','Pteridophytes',[op('A','Roots'),op('B','Stems'),op('C','Sporophylls',true),op('D','Flowers')],'Sporangia are borne on sporophylls (specialized leaves) in pteridophytes.'),
    q(16,'First vascular plant group:','Pteridophytes',[op('A','Bryophytes'),op('B','Pteridophytes',true),op('C','Gymnosperms'),op('D','Angiosperms')],'Pteridophytes were the first vascular plants, appearing in the Silurian period.'),
    q(17,'Gymnosperms lack:','Gymnosperms',[op('A','Seeds'),op('B','Vascular tissues'),op('C','Fruits',true),op('D','Pollen')],'Gymnosperm seeds are naked (not enclosed in fruits).'),
    q(18,'Tallest gymnosperm:','Gymnosperms',[op('A','Pinus'),op('B','Sequoia',true),op('C','Cycas'),op('D','Ginkgo')],'Sequoia (redwood) is the tallest gymnosperm, over 100 m tall.'),
    q(19,'Feature of monocots:','Angiosperms',[op('A','Reticulate venation'),op('B','Parallel venation',true),op('C','Tap root'),op('D','Tetramerous flowers')],'Monocots have parallel venation, fibrous roots, and trimerous flowers.'),
    q(20,'Most advanced plant group:','Angiosperms',[op('A','Algae'),op('B','Bryophytes'),op('C','Gymnosperms'),op('D','Angiosperms',true)],'Angiosperms are the most advanced with flowers, fruits, and efficient vascular systems.'),
    q(21,'Algal cell wall is:','Algae',[op('A','Chitin'),op('B','Cellulose',true),op('C','Peptidoglycan'),op('D','Pectin')],'Algal cell walls are cellulose. Some have agar (red) or alginic acid (brown).'),
    q(22,'Haploid phase in plant life cycle:','Life Cycles',[op('A','Sporophyte'),op('B','Gametophyte',true),op('C','Zygote'),op('D','Embryo')],'Gametophyte is haploid; sporophyte is diploid.'),
    q(23,'Diplontic life cycle dominant phase:','Life Cycles',[op('A','Gametophyte'),op('B','Sporophyte',true),op('C','Both'),op('D','Protonema')],'Diplontic: sporophyte dominant. Example: gymnosperms and angiosperms.'),
    q(24,'Heterospory occurs in:','Pteridophytes',[op('A','All pteridophytes'),op('B','Selaginella and Salvinia',true),op('C','All bryophytes'),op('D','Only angiosperms')],'Heterospory in Selaginella and Salvinia led to seed habit evolution.'),
    q(25,'Alternation of generations first described in:','Life Cycles',[op('A','Ulva (algae)',true),op('B','Bryophytes'),op('C','Pteridophytes'),op('D','Angiosperms')],'Alternation of generations was first described in Ulva by Thuret.'),
    q(26,'Bryophyte with leafy gametophyte:','Bryophytes',[op('A','Marchantia'),op('B','Funaria',true),op('C','Ulothrix'),op('D','Chara')],'Funaria (moss) has a leafy gametophyte. Marchantia is thalloid.'),
    q(27,'Gymnosperm cotyledons:','Gymnosperms',[op('A','One'),op('B','Two'),op('C','Many',true),op('D','Absent')],'Gymnosperms are polycotyledonous. Pinus has 5-18 cotyledons.'),
    q(28,'Source of agar:','Algae',[op('A','Spirogyra'),op('B','Gracilaria',true),op('C','Laminaria'),op('D','Chlorella')],'Agar from red algae Gracilaria and Gelidium, used as solidifying agent.'),
    q(29,'Bryophyte sporophyte is:','Bryophytes',[op('A','Independent'),op('B','Dependent on gametophyte',true),op('C','Dominant'),op('D','Free-living')],'Bryophyte sporophyte depends on gametophyte for nutrition.'),
    q(30,'Which is a pteridophyte?','Pteridophytes',[op('A','Funaria'),op('B','Marchantia'),op('C','Pteris',true),op('D','Cycas')],'Pteris (fern) is a pteridophyte. Funaria and Marchantia are bryophytes.')
  ]
});

// Chapter 4: Animal Kingdom
chapters.push({ num:4, name:'Animal Kingdom', slug:'animal-kingdom', topics:'Porifera to Chordata, Classification',
  desc:'30 NEET-level MCQs on Animal Kingdom covering phylum Porifera to Chordata, symmetry, body plans, coelom, and classification.',
  qs:[
    q(1,'Which phylum has cellular level of organization?','Porifera',[op('A','Porifera',true),op('B','Cnidaria'),op('C','Platyhelminthes'),op('D','Annelida')],'Porifera (sponges) have cellular level organization where cells function independently.'),
    q(2,'Cnidaria is characterized by:','Cnidaria',[op('A','Nematocysts',true),op('B','Nephridia'),op('C','Malpighian tubules'),op('D','Radula')],'Cnidarians have stinging cells (cnidocytes/nematocysts) for defense and prey capture.'),
    q(3,'Adult echinoderms have:','Echinodermata',[op('A','Asymmetry'),op('B','Radial symmetry',true),op('C','Bilateral symmetry'),op('D','Spherical symmetry')],'Adult echinoderms have pentamerous radial symmetry; larvae are bilateral.'),
    q(4,'Animals with true coelom are:','Coelom',[op('A','Acoelomates'),op('B','Pseudocoelomates'),op('C','Coelomates',true),op('D','Enterocoelomates')],'Coelomates have a true coelom lined by mesoderm.'),
    q(5,'Which is a pseudocoelomate?','Coelom',[op('A','Earthworm'),op('B','Roundworm',true),op('C','Tapeworm'),op('D','Starfish')],'Roundworms (Nematoda) are pseudocoelomates. Earthworm is coelomate, tapeworm is acoelomate.'),
    q(6,'Largest phylum by species:','Arthropoda',[op('A','Mollusca'),op('B','Arthropoda',true),op('C','Chordata'),op('D','Annelida')],'Arthropoda is the largest phylum with 80% of all known species.'),
    q(7,'Pearl-producing mollusc:','Mollusca',[op('A','Octopus'),op('B','Pila'),op('C','Pinctada',true),op('D','Sepia')],'Pinctada (pearl oyster) produces pearls when foreign particles get trapped in the mantle.'),
    q(8,'Water vascular system is in:','Echinodermata',[op('A','Mollusca'),op('B','Annelida'),op('C','Echinodermata',true),op('D','Arthropoda')],'Echinoderms have a unique water vascular system for locomotion and food capture via tube feet.'),
    q(9,'Notochord is present:','Chordata',[op('A','In all chordates throughout life'),op('B','In chordates at some stage',true),op('C','Only in invertebrates'),op('D','In all animals')],'Notochord is present in all chordates at some stage. In vertebrates, it is replaced by the vertebral column.'),
    q(10,'Mammary glands are in:','Mammalia',[op('A','Aves'),op('B','Reptilia'),op('C','Mammalia',true),op('D','Amphibia')],'Mammals have mammary glands for milk production and hair on the body.'),
    q(11,'Sponges belong to:','Porifera',[op('A','Coelenterata'),op('B','Porifera',true),op('C','Protozoa'),op('D','Mesozoa')],'Porifera are sponges with pores (ostia) and a canal system for filter feeding.'),
    q(12,'Polyp and medusa forms in:','Cnidaria',[op('A','Porifera'),op('B','Cnidaria',true),op('C','Platyhelminthes'),op('D','Annelida')],'Cnidarians exist as polyp (Hydra) and medusa (jellyfish); some show alternation of generations.'),
    q(13,'Tapeworm belongs to:','Platyhelminthes',[op('A','Nematoda'),op('B','Platyhelminthes',true),op('C','Annelida'),op('D','Arthropoda')],'Tapeworm (Taenia) is a flatworm (Platyhelminthes), an endoparasite with a flat body.'),
    q(14,'Annelid body is:','Annelida',[op('A','Unsegmented'),op('B','Segmented',true),op('C','Spiral'),op('D','Irregular')],'Annelids have metamerically segmented bodies (both external and internal segmentation).'),
    q(15,'Excretion in crustaceans via:','Arthropoda',[op('A','Nephridia'),op('B','Malpighian tubules'),op('C','Green glands',true),op('D','Kidneys')],'Crustaceans excrete via green glands (antennal glands). Insects use Malpighian tubules.'),
    q(16,'Not a chordate characteristic:','Chordata',[op('A','Notochord'),op('B','Dorsal hollow nerve cord'),op('C','Pharyngeal gill slits'),op('D','Ventral solid nerve cord',true)],'Chordates have a dorsal hollow nerve cord, not a ventral solid one.'),
    q(17,'Birds belong to:','Aves',[op('A','Mammalia'),op('B','Reptilia'),op('C','Aves',true),op('D','Amphibia')],'Aves (birds) have feathers, wings, four-chambered heart, and are warm-blooded.'),
    q(18,'Frog belongs to:','Amphibia',[op('A','Reptilia'),op('B','Amphibia',true),op('C','Pisces'),op('D','Mammalia')],'Amphibia can live in water and on land; they have a three-chambered heart.'),
    q(19,'Most reptiles have heart:','Reptilia',[op('A','Two-chambered'),op('B','Three-chambered',true),op('C','Four-chambered'),op('D','One-chambered')],'Most reptiles have three-chambered hearts (except crocodiles with four).'),
    q(20,'Cartilaginous fish example:','Pisces',[op('A','Rohu'),op('B','Catla'),op('C','Shark',true),op('D','Tuna')],'Sharks are cartilaginous fish (Chondrichthyes). Rohu and Catla are bony fish.'),
    q(21,'Open circulatory system in:','Arthropoda',[op('A','Annelida'),op('B','Arthropoda',true),op('C','Chordata'),op('D','Mollusca')],'Arthropods have open circulation; annelids and chordates have closed circulation.'),
    q(22,'Hermaphrodite example:','Platyhelminthes',[op('A','Earthworm',true),op('B','Cockroach'),op('C','Frog'),op('D','Lizard')],'Earthworms are hermaphrodites with both sex organs, but they cross-fertilize.'),
    q(23,'Malpighian tubules in:','Arthropoda',[op('A','Earthworm'),op('B','Cockroach',true),op('C','Tapeworm'),op('D','Starfish')],'Malpighian tubules are excretory organs in insects like cockroaches.'),
    q(24,'Common Indian earthworm:','Annelida',[op('A','Pheretima posthuma',true),op('B','Lumbricus terrestris'),op('C','Eisenia fetida'),op('D','Nereis')],'Pheretima posthuma is the common Indian earthworm for dissection.'),
    q(25,'Radula is found in:','Mollusca',[op('A','Cockroach'),op('B','Snail',true),op('C','Earthworm'),op('D','Starfish')],'Molluscs like snails have a radula (rasping organ with rows of teeth).'),
    q(26,'Only flying mammal:','Mammalia',[op('A','Flying squirrel'),op('B','Bat',true),op('C','Flying fox'),op('D','Pterodactyl')],'Bats are the only true flying mammals. Flying squirrels glide.'),
    q(27,'Echinoderm example:','Echinodermata',[op('A','Sepia'),op('B','Asterias',true),op('C','Pila'),op('D','Loligo')],'Asterias (starfish) is an echinoderm. Sepia, Pila, Loligo are molluscs.'),
    q(28,'Animals with both sperm and eggs:','Reproduction',[op('A','Gonochoristic'),op('B','Hermaphrodite',true),op('C','Parthenogenetic'),op('D','Dioecious')],'Hermaphrodites (monoecious) have both male and female reproductive organs.'),
    q(29,'Shedding exoskeleton in arthropods:','Arthropoda',[op('A','Hibernation'),op('B','Ecdysis',true),op('C','Metamorphosis'),op('D','Aestivation')],'Ecdysis (molting) is shedding the exoskeleton for growth, controlled by ecdysone.'),
    q(30,'Jawless fish example:','Pisces',[op('A','Shark'),op('B','Petromyzon',true),op('C','Rohu'),op('D','Catla')],'Petromyzon (lamprey) is a jawless fish (Cyclostomata), ectoparasite on fish.')
  ]
});

// Chapter 5: Morphology of Flowering Plants
chapters.push({ num:5, name:'Morphology of Flowering Plants', slug:'morphology-of-flowering-plants', topics:'Root, Stem, Leaf, Inflorescence, Flower, Fruit, Seed',
  desc:'30 NEET-level MCQs on Morphology of Flowering Plants covering root systems, stem modifications, leaf types, inflorescence, flower structure, fruit and seed.',
  qs:[
    q(1,'Primary root grows from:','Root',[op('A','Radicle',true),op('B','Plumule'),op('C','Cotyledon'),op('D','Hypocotyl')],'Radicle develops into the primary root (tap root system).'),
    q(2,'Fibrous root system is found in:','Root',[op('A','Mustard'),op('B','Wheat',true),op('C','Sunflower'),op('D','Pea')],'Wheat (monocot) has fibrous roots; mustard, sunflower, pea (dicots) have tap roots.'),
    q(3,'Region of root where cells undergo elongation:','Root',[op('A','Root cap'),op('B','Meristematic region'),op('C','Region of elongation',true),op('D','Region of maturation')],'Cells elongate in the region of elongation, increasing root length.'),
    q(4,'Pneumatophores are found in:','Root',[op('A','Rhizophora',true),op('B','Turnip'),op('C','Carrot'),op('D','Radish')],'Pneumatophores (respiratory roots) in mangroves like Rhizophora grow upward for gas exchange.'),
    q(5,'Sweet potato is a modified:','Root',[op('A','Tap root'),op('B','Adventitious root',true),op('C','Stem'),op('D','Leaf')],'Sweet potato is a modified adventitious root for food storage.'),
    q(6,'Stem region between nodes:','Stem',[op('A','Node'),op('B','Internode',true),op('C','Axil'),op('D','Petiole')],'Internode is the region between two nodes on a stem.'),
    q(7,'Potato (Solanum tuberosum) is a modified:','Stem',[op('A','Root'),op('B','Stem',true),op('C','Leaf'),op('D','Fruit')],'Potato is an underground stem (tuber) with buds (eyes).'),
    q(8,'Thorn of Bougainvillea is a modified:','Stem',[op('A','Leaf'),op('B','Stem',true),op('C','Root'),op('D','Stipule')],'Bougainvillea thorns are modified axillary stems for protection.'),
    q(9,'Tendril in pea is a modified:','Stem',[op('A','Leaf'),op('B','Leaflet'),op('C','Stem',true),op('D','Root')],'Pea tendrils are modified stems (leaflet tendrils in terminal position).'),
    q(10,'Reticulate venation is typical of:','Leaf',[op('A','Monocots'),op('B','Dicots',true),op('C','Gymnosperms'),op('D','Pteridophytes')],'Dicots usually have reticulate venation; monocots have parallel venation.'),
    q(11,'Leaves with parallel venation:','Leaf',[op('A','Mango'),op('B','Banyan'),op('C','Grass',true),op('D','Rose')],'Grass (monocot) has parallel venation. Mango, banyan, rose are dicots with reticulate venation.'),
    q(12,'Pinnately compound leaf example:','Leaf',[op('A','Neem',true),op('B','Bombax'),op('C','Cotton'),op('D','Gossypium')],'Neem has pinnately compound leaves with leaflets arranged along a rachis.'),
    q(13,'Phyllotaxy with two leaves per node:','Leaf',[op('A','Alternate'),op('B','Opposite',true),op('C','Whorled'),op('D','Spiral')],'Opposite phyllotaxy (e.g., Calotropis) has two leaves per node on opposite sides.'),
    q(14,'Racemose inflorescence:','Inflorescence',[op('A','Young flowers at top'),op('B','Young flowers at base',true),op('C','No definite pattern'),op('D','Flowers in clusters')],'Racemose: main axis continues growing; older flowers at base, younger at tip.'),
    q(15,'Cymose inflorescence:','Inflorescence',[op('A','Infinite growth'),op('B','Finite growth',true),op('C','Spikelets'),op('D','Catkin')],'Cymose: main axis terminates in a flower; growth is determinate.'),
    q(16,'Complete flower has:','Flower',[op('A','Calyx only'),op('B','Calyx, corolla, androecium, gynoecium',true),op('C','Androecium only'),op('D','Gynoecium only')],'A complete flower has all four whorls: calyx, corolla, androecium, gynoecium.'),
    q(17,'Male reproductive part is:','Flower',[op('A','Gynoecium'),op('B','Androecium',true),op('C','Corolla'),op('D','Calyx')],'Androecium (stamens) is the male reproductive whorl producing pollen.'),
    q(18,'Inferior ovary found in:','Flower',[op('A','Hypogynous'),op('B','Perigynous'),op('C','Epigynous',true),op('D','Superior')],'Epigynous flowers have inferior ovary (e.g., apple, sunflower).'),
    q(19,'Placentation with ovules on central column:','Flower',[op('A','Marginal'),op('B','Axile',true),op('C','Parietal'),op('D','Free central')],'Axile placentation: ovules attached to central column (e.g., tomato, lemon).'),
    q(20,'Parietal placentation in:','Flower',[op('A','Pea'),op('B','Mustard',true),op('C','Sunflower'),op('D','Marigold')],'Parietal placentation in mustard (ovules on ovary wall). Pea has marginal.'),
    q(21,'Free central placentation in:','Flower',[op('A','Bean'),op('B','Primrose',true),op('C','Lily'),op('D','Rose')],'Free central: ovules on central axis not connected to ovary wall (e.g., Primula/Dianthus).'),
    q(22,'Fruit that develops without fertilization:','Fruit',[op('A','Simple fruit'),op('B','Parthenocarpic fruit',true),op('C','Aggregate fruit'),op('D','Multiple fruit')],'Parthenocarpic fruits develop without fertilization (e.g., seedless banana).'),
    q(23,'Maize grain is a:','Fruit',[op('A','Berry'),op('B','Caryopsis',true),op('C','Nut'),op('D','Drupe')],'Caryopsis: pericarp fused with seed coat; typical of grasses including maize.'),
    q(24,'Seed with two cotyledons:','Seed',[op('A','Maize'),op('B','Bean',true),op('C','Wheat'),op('D','Rice')],'Bean (dicot) has two cotyledons. Maize, wheat, rice are monocots with one cotyledon.'),
    q(25,'Monocot seed endosperm is:','Seed',[op('A','Absent'),op('B','Persistent',true),op('C','Consumed'),op('D','Thin')],'Monocot seeds have persistent endosperm (e.g., maize, wheat). Dicot seeds like pea lack endosperm.'),
    q(26,'Inflorescence of wheat:','Inflorescence',[op('A','Raceme'),op('B','Spike of spikelets',true),op('C','Cyme'),op('D','Corymb')],'Wheat has a spike of spikelets (compound inflorescence of Poaceae family).'),
    q(27,'Flower with perianth:','Flower',[op('A','Calyx + corolla distinct'),op('B','Tepals',true),op('C','Stamens only'),op('D','Carpels only')],'Perianth: calyx and corolla not distinct; tepals present (e.g., lily, onion).'),
    q(28,'Epipetalous stamens in:','Flower',[op('A','Lily'),op('B','Petunia',true),op('C','Tomato'),op('D','Pea')],'Epipetalous: stamens attached to petals (e.g., Petunia, Solanaceae).'),
    q(29,'Simple leaf example:','Leaf',[op('A','Neem'),op('B','Rose'),op('C','Mango',true),op('D','Acacia')],'Mango has a simple leaf (single leaf blade). Neem and rose have compound leaves.'),
    q(30,'Zygomorphic flower:','Flower',[op('A','Mustard'),op('B','Pea',true),op('C','Tomato'),op('D','Datura')],'Zygomorphic (bilateral symmetry) in pea. Mustard, tomato, datura are actinomorphic (radial).')
  ]
});

// Chapter 6: Anatomy of Flowering Plants
chapters.push({ num:6, name:'Anatomy of Flowering Plants', slug:'anatomy-of-flowering-plants', topics:'Tissues, Tissue Systems, Root/Stem/Leaf Anatomy, Secondary Growth',
  desc:'30 NEET-level MCQs on Anatomy of Flowering Plants covering meristems, simple and complex tissues, tissue systems, dicot/monocot anatomy, and secondary growth.',
  qs:[
    q(1,'Lateral meristems cause:','Meristems',[op('A','Height growth'),op('B','Increase in girth',true),op('C','Leaf growth'),op('D','Root elongation')],'Lateral meristems (cambium) increase girth/diameter. Apical meristems increase height.'),
    q(2,'Intercalary meristem is found at:','Meristems',[op('A','Root tip'),op('B','Shoot tip'),op('C','Base of leaves/internodes',true),op('D','Vascular bundles')],'Intercalary meristems at leaf bases or internodes (grasses) enable regrowth.'),
    q(3,'Parenchyma cells are:','Simple Tissues',[op('A','Dead'),op('B','Living with thin walls',true),op('C','Thick-walled'),op('D','Lignified')],'Parenchyma: living cells with thin cellulosic walls; most abundant tissue.'),
    q(4,'Collenchyma cells have:','Simple Tissues',[op('A','Lignified walls'),op('B','Pectin deposits at corners',true),op('C','Dead cells'),op('D','Suberized walls')],'Collenchyma has pectin and cellulose deposits at corners; provides flexible support.'),
    q(5,'Sclerenchyma fibers are:','Simple Tissues',[op('A','Living'),op('B','Dead with lignified walls',true),op('C','Thin-walled'),op('D','Photosynthetic')],'Sclerenchyma: dead cells with thick lignified walls; provide mechanical strength.'),
    q(6,'Xylem conducts:','Complex Tissues',[op('A','Food'),op('B','Water and minerals',true),op('C','Amino acids'),op('D','Hormones')],'Xylem conducts water and minerals upward. Phloem conducts food.'),
    q(7,'Xylem elements with sieve plates?','Complex Tissues',[op('A','Tracheids'),op('B','Vessels'),op('C','Both'),op('D','None',true)],'Sieve plates are in phloem sieve tubes; xylem has tracheids, vessels, xylem fibers, xylem parenchyma.'),
    q(8,'Phloem conducts food via:','Complex Tissues',[op('A','Xylem vessels'),op('B','Sieve tubes',true),op('C','Tracheids'),op('D','Companion cells')],'Sieve tubes (living but enucleate) conduct food; companion cells maintain them.'),
    q(9,'Companion cells are found in:','Complex Tissues',[op('A','Xylem'),op('B','Phloem',true),op('C','Cortex'),op('D','Pith')],'Companion cells are specialized phloem cells adjacent to sieve tube elements.'),
    q(10,'Which tissue replaces epidermis in older stems?','Tissue Systems',[op('A','Cortex'),op('B','Periderm',true),op('C','Endodermis'),op('D','Pith')],'Periderm (cork cambium + cork) replaces epidermis in older stems and roots.'),
    q(11,'Casparian strips occur in:','Tissue Systems',[op('A','Cortex'),op('B','Endodermis',true),op('C','Pericycle'),op('D','Pith')],'Casparian strips (suberin bands) in endodermis regulate water flow to stele.'),
    q(12,'Dicot root has:','Root Anatomy',[op('A','Polyarch xylem'),op('B','Diarch to tetrarch xylem',true),op('C','Scattered bundles'),op('D','No pith')],'Dicot roots have 2-4 xylem bundles (diarch/tetrarch); monocot roots are polyarch.'),
    q(13,'Pith is larger in:','Root Anatomy',[op('A','Dicot root'),op('B','Monocot root',true),op('C','Dicot stem'),op('D','Monocot stem')],'Monocot roots have a large pith; dicot roots have a small or absent pith.'),
    q(14,'Arrangement of vascular bundles in dicot stem:','Stem Anatomy',[op('A','Scattered'),op('B','Ring',true),op('C','Irregular'),op('D','Central')],'Dicot stem: vascular bundles arranged in a ring, open with cambium.'),
    q(15,'In monocot stem, vascular bundles are:','Stem Anatomy',[op('A','In a ring'),op('B','Scattered',true),op('C','Conjoint'),op('D','Bicollateral')],'Monocot stem: numerous scattered closed vascular bundles (without cambium).'),
    q(16,'Hypodermis in dicot stem is:','Stem Anatomy',[op('A','Sclerenchyma'),op('B','Collenchyma',true),op('C','Parenchyma'),op('D','Chlorenchyma')],'Dicot stem hypodermis is collenchymatous; monocot stem hypodermis is sclerenchymatous.'),
    q(17,'Bulliform cells found in:','Leaf Anatomy',[op('A','Dicot leaf'),op('B','Monocot leaf',true),op('C','Root'),op('D','Stem')],'Bulliform (motor) cells in monocot leaves help with leaf folding to reduce water loss.'),
    q(18,'Kranz anatomy is characteristic of:','Leaf Anatomy',[op('A','C3 plants'),op('B','C4 plants',true),op('C','CAM plants'),op('D','All plants')],'Kranz anatomy (bundle sheath cells with chloroplasts) in C4 plants like maize.'),
    q(19,'Bundle sheath in C4 leaf:','Leaf Anatomy',[op('A','Without chloroplasts'),op('B','With large chloroplasts',true),op('C','Thin-walled'),op('D','Collenchymatous')],'Bundle sheath cells in C4 leaves have large chloroplasts for the Calvin cycle.'),
    q(20,'Vascular cambium is:','Secondary Growth',[op('A','Apical meristem'),op('B','Lateral meristem',true),op('C','Intercalary meristem'),op('D','Ground meristem')],'Vascular cambium is a lateral meristem that produces secondary xylem and phloem.'),
    q(21,'Wood (secondary xylem) is produced by:','Secondary Growth',[op('A','Cork cambium'),op('B','Vascular cambium',true),op('C','Apical meristem'),op('D','Pith')],'Vascular cambium divides to produce secondary xylem (wood) inward and secondary phloem outward.'),
    q(22,'Annual rings are due to:','Secondary Growth',[op('A','Cork formation'),op('B','Difference in spring and autumn wood',true),op('C','Phloem growth'),op('D','Leaf fall')],'Annual rings: light spring wood (large vessels) + dark autumn wood (small vessels).'),
    q(23,'Sapwood vs heartwood:','Secondary Growth',[op('A','Sapwood is dead, heartwood is living'),op('B','Heartwood is functional, sapwood is dead'),op('C','Sapwood conducts water, heartwood does not',true),op('D','Both are equally functional')],'Sapwood (outer) conducts water; heartwood (inner, dark) is non-functional, filled with tannins.'),
    q(24,'Cork is produced by:','Secondary Growth',[op('A','Vascular cambium'),op('B','Cork cambium (phellogen)',true),op('C','Procambium'),op('D','Ground meristem')],'Cork cambium (phellogen) produces cork (phellem) outward and phelloderm inward.'),
    q(25,'Lenticels function:','Secondary Growth',[op('A','Absorption'),op('B','Gas exchange',true),op('C','Photosynthesis'),op('D','Reproduction')],'Lenticels in cork allow gas exchange between internal tissues and the atmosphere.'),
    q(26,'Bark includes:','Secondary Growth',[op('A','Only cork'),op('B','Cork + cork cambium',true),op('C','Secondary xylem'),op('D','Vascular cambium')],'Bark = cork (phellem) + cork cambium (phellogen) + phelloderm.'),
    q(27,'Tyloses are:','Secondary Growth',[op('A','Outgrowths into xylem vessels',true),op('B','Root hairs'),op('C','Stem hairs'),op('D','Leaf hairs')],'Tyloses are outgrowths of xylem parenchyma into vessel lumens, blocking water flow in heartwood.'),
    q(28,'Sieve tube elements lack:','Complex Tissues',[op('A','Nucleus at maturity',true),op('B','Cytoplasm'),op('C','Cell wall'),op('D','Plasma membrane')],'Sieve tube elements lose nucleus at maturity but retain cytoplasm, maintained by companion cells.'),
    q(29,'Hydathodes excrete:','Leaf Anatomy',[op('A','Sugars'),op('B','Water',true),op('C','Salts'),op('D','Oxygen')],'Hydathodes at leaf tips excrete water (guttation) through water pores.'),
    q(30,'Protoxylem vs metaxylem:','Complex Tissues',[op('A','Protoxylem has larger vessels'),op('B','Metaxylem differentiates later with larger vessels',true),op('C','Protoxylem is toward pith'),op('D','Metaxylem is toward periphery')],'Metaxylem differentiates later and has larger vessels; protoxylem has smaller vessels.')
  ]
});

// Chapter 7: Structural Organization in Animals
chapters.push({ num:7, name:'Structural Organization in Animals', slug:'structural-organization-in-animals', topics:'Earthworm, Cockroach, Frog Morphology & Anatomy',
  desc:'30 NEET-level MCQs on Structural Organization in Animals covering morphology and anatomy of earthworm, cockroach, and frog.',
  qs:[
    q(1,'Earthworm body is divided into how many segments?','Earthworm',[op('A','100-120'),op('B','120-140'),op('C','100-125',true),op('D','150-175')],'Earthworm (Pheretima) has 100-125 segments/ metameres.'),
    q(2,'Clitellum in earthworm is present in:','Earthworm',[op('A','Segments 10-12'),op('B','Segments 14-16',true),op('C','Segments 20-22'),op('D','Segments 5-7')],'Clitellum segments 14-16: a glandular band involved in cocoon formation.'),
    q(3,'Setae in earthworm are:','Earthworm',[op('A','Absent'),op('B','S-shaped chitinous',true),op('C','Proteinaceous'),op('D','Calcareous')],'Setae are S-shaped chitinous bristles for locomotion; embedded in body wall.'),
    q(4,'Earthworm excretory organs:','Earthworm',[op('A','Malpighian tubules'),op('B','Nephridia',true),op('C','Green glands'),op('D','Kidneys')],'Nephridia (septal, integumentary, pharyngeal) are excretory organs in earthworms.'),
    q(5,'Earthworm hearts are:','Earthworm',[op('A','2 pairs'),op('B','4 pairs',true),op('C','6 pairs'),op('D','3 pairs')],'Earthworm has 4 pairs of hearts (lateral in segs 7-11), plus dorsal and ventral vessels.'),
    q(6,'Seminal vesicles in earthworm:','Earthworm',[op('A','Segments 10-11'),op('B','Segments 11-12',true),op('C','Segments 13-14'),op('D','Segments 15-16')],'Two pairs of seminal vesicles in segments 11 and 12 store sperms.'),
    q(7,'Earthworm cocoon formed at:','Earthworm',[op('A','Segments 14-16',true),op('B','Segments 20-22'),op('C','Segments 30-35'),op('D','Segments 5-7')],'Clitellum (14-16) secretes mucus ring that forms the cocoon after fertilization.'),
    q(8,'Cockroach head is:','Cockroach',[op('A','Hypognathous',true),op('B','Prognathous'),op('C','Opisthognathous'),op('D','None')],'Cockroach head is hypognathous (mouthparts directed downward).'),
    q(9,'Cockroach compound eye:','Cockroach',[op('A','1000 ommatidia'),op('B','2000 ommatidia',true),op('C','5000 ommatidia'),op('D','500 ommatidia')],'Each compound eye has about 2000 ommatidia for mosaic vision.'),
    q(10,'Wings of cockroach attach to:','Cockroach',[op('A','Prothorax'),op('B','Mesothorax',true),op('C','Metathorax'),op('D','Head')],'Forewings (tegmina) on mesothorax; hindwings on metathorax for flight.'),
    q(11,'Cockroach has how many Malpighian tubules?','Cockroach',[op('A','50-100'),op('B','100-150',true),op('C','20-40'),op('D','200-250')],'100-150 Malpighian tubules at junction of midgut and hindgut, excretory in function.'),
    q(12,'Cockroach heart is:','Cockroach',[op('A','2-chambered'),op('B','13-chambered',true),op('C','4-chambered'),op('D','Single-chambered')],'Cockroach heart is 13-chambered (metameric), each with ostia for blood flow.'),
    q(13,'Cockroach blood is called:','Cockroach',[op('A','Blood'),op('B','Hemolymph',true),op('C','Lymph'),op('D','Serum')],'Hemolymph (colorless) contains hemocytes and lacks hemoglobin.'),
    q(14,'Crop in cockroach is for:','Cockroach',[op('A','Digestion'),op('B','Storage',true),op('C','Absorption'),op('D','Excretion')],'Crop stores food; gizzard grinds it with chitinous teeth.'),
    q(15,'Cockroach nervous system:','Cockroach',[op('A','Dorsal nerve cord'),op('B','Ventral nerve cord',true),op('C','No nerve cord'),op('D','Radial nerve cord')],'Cockroach has a ventral nerve cord with segmental ganglia (supra- and sub-esophageal ganglia).'),
    q(16,'Frog skin is:','Frog',[op('A','Dry and scaly'),op('B','Moist and slimy',true),op('C','Feathered'),op('D','Hairy')],'Frog skin is moist, slimy (mucous), and highly vascular for cutaneous respiration.'),
    q(17,'Frog respiration includes:','Frog',[op('A','Only lungs'),op('B','Lungs, skin, buccal cavity',true),op('C','Gills'),op('D','Tracheae')],'Frogs respire through lungs (adult), skin (cutaneous), and buccal cavity lining.'),
    q(18,'Frog heart is:','Frog',[op('A','2-chambered'),op('B','3-chambered',true),op('C','4-chambered'),op('D','1-chambered')],'Frog heart: 3 chambers (two atria, one ventricle) with sinus venosus and conus arteriosus.'),
    q(19,'Frog RBCs are:','Frog',[op('A','Circular and enucleated'),op('B','Oval and nucleated',true),op('C','Circular and nucleated'),op('D','Oval and enucleated')],'Frog RBCs are oval, nucleated, and contain hemoglobin.'),
    q(20,'Frog excretory product:','Frog',[op('A','Urea',true),op('B','Uric acid'),op('C','Ammonia'),op('D','Guanine')],'Frogs are ureotelic (excrete urea as nitrogenous waste).'),
    q(21,'Cloaca in frog is:','Frog',[op('A','Digestive only'),op('B','Common passage for digestive, urinary, reproductive',true),op('C','Respiratory only'),op('D','Excretory only')],'Cloaca receives products from digestive, urinary, and reproductive systems.'),
    q(22,'Frog larvae (tadpole) respire via:','Frog',[op('A','Lungs'),op('B','Gills',true),op('C','Skin'),op('D','Tracheae')],'Tadpoles have gills for aquatic respiration; metamorphosis develops lungs for adults.'),
    q(23,'Frog hibernates in:','Frog',[op('A','Summer'),op('B','Winter',true),op('C','Rainy season'),op('D','Spring')],'Frogs hibernate (winter sleep) buried in mud; aestivate in summer.'),
    q(24,'Earthworm crop in segment:','Earthworm',[op('A','7-8'),op('B','8-9',true),op('C','10-12'),op('D','14-16')],'Crop in segments 8-9 for food storage; gizzard in segments 9-10.'),
    q(25,'Earthworm dorsal pore function:','Earthworm',[op('A','Excretion'),op('B','Lubrication',true),op('C','Respiration'),op('D','Circulation')],'Dorsal pores secrete coelomic fluid for lubrication of body surface.'),
    q(26,'Cockroach ootheca contains:','Cockroach',[op('A','Sperms'),op('B','Eggs',true),op('C','Both'),op('D','Nymphs')],'Ootheca is a dark brown capsule containing 14-16 fertilized eggs.'),
    q(27,'Cockroach metamorphosis:','Cockroach',[op('A','Complete'),op('B','Incomplete',true),op('C','No metamorphosis'),op('D','Holometabolous')],'Cockroach undergoes incomplete metamorphosis (egg -> nymph -> adult; no pupal stage).'),
    q(28,'Frog tongue is:','Frog',[op('A','Attached anteriorly, free posteriorly',true),op('B','Free anteriorly, attached posteriorly'),op('C','Completely attached'),op('D','Completely free')],'Frog tongue is attached to the front of the mouth (anterior), free at the back, can flip out.'),
    q(29,'Vomerine teeth in frog:','Frog',[op('A','On lower jaw'),op('B','On upper jaw roof',true),op('C','On tongue'),op('D','Absent')],'Vomerine teeth on the roof of the buccal cavity help hold prey; maxillary teeth on upper jaw.'),
    q(30,'Earthworm is:','Earthworm',[op('A','Monoecious',true),op('B','Dioecious'),op('C','Parthenogenetic'),op('D','Asexual')],'Earthworms are monoecious (hermaphrodites), but cross-fertilization occurs.')
  ]
});

// Chapter 8: Cell: The Unit of Life (already exists as manual file, adding for completeness)
chapters.push({ num:8, name:'Cell: The Unit of Life', slug:'cell-the-unit-of-life', topics:'Cell Theory, Prokaryotic vs Eukaryotic, Organelles',
  desc:'30 NEET-level MCQs on Cell: The Unit of Life covering cell theory, prokaryotic and eukaryotic cells, cell organelles, and their functions.',
  qs:[
    q(1,'Cell theory was given by:','Cell Theory',[op('A','Schleiden and Schwann',true),op('B','Darwin and Wallace'),op('C','Mendel and Morgan'),op('D','Watson and Crick')],'Schleiden (1838) and Schwann (1839) proposed cell theory; Virchow added "omnis cellula e cellula".'),
    q(2,'Prokaryotic cell lacks:','Prokaryotic',[op('A','DNA'),op('B','Membrane-bound organelles',true),op('C','Ribosomes'),op('D','Cell wall')],'Prokaryotes lack membrane-bound organelles (nucleus, mitochondria, etc.).'),
    q(3,'Mesosome function:','Prokaryotic',[op('A','Photosynthesis'),op('B','Cell wall formation, DNA replication',true),op('C','Protein synthesis'),op('D','Lipid storage')],'Mesosomes are infoldings of the plasma membrane involved in cell wall formation and DNA replication.'),
    q(4,'Chromatophores in bacteria:','Prokaryotic',[op('A','Store nutrients'),op('B','Carry photosynthetic pigments',true),op('C','Help locomotion'),op('D','Form spores')],'Chromatophores in photosynthetic bacteria (e.g., Rhodospirillum) carry bacteriochlorophyll.'),
    q(5,'Nucleoid is:','Prokaryotic',[op('A','Membrane-bound nucleus'),op('B','Naked DNA without membrane',true),op('C','Nuclear envelope'),op('D','Nucleolus')],'Nucleoid is the region with naked circular DNA, not enclosed by a nuclear membrane.'),
    q(6,'Ribosomes in prokaryotes:','Prokaryotic',[op('A','80S'),op('B','70S',true),op('C','60S'),op('D','90S')],'Prokaryotes have 70S ribosomes (50S + 30S subunits). Eukaryotes have 80S.'),
    q(7,'Cell wall of bacteria:','Prokaryotic',[op('A','Cellulose'),op('B','Peptidoglycan',true),op('C','Chitin'),op('D','Pectin')],'Bacterial cell wall has peptidoglycan (murein); Gram+ has thick layer, Gram- has thin.'),
    q(8,'Eukaryotic nucleus has:','Nucleus',[op('A','Nuclear envelope with pores',true),op('B','No nuclear membrane'),op('C','No nucleolus'),op('D','Circular DNA')],'Eukaryotic nucleus: double membrane (nuclear envelope) with pores, nucleolus, linear DNA.'),
    q(9,'Chromatin is made of:','Nucleus',[op('A','DNA only'),op('B','DNA + histone proteins',true),op('C','RNA only'),op('D','Proteins only')],'Chromatin = DNA + histones (nucleosomes). Condenses to chromosomes during division.'),
    q(10,'Function of nucleolus:','Nucleus',[op('A','DNA replication'),op('B','rRNA synthesis',true),op('C','Protein synthesis'),op('D','Lipid synthesis')],'Nucleolus produces rRNA and assembles ribosomal subunits.'),
    q(11,'Mitochondria are:','Mitochondria',[op('A','Site of ATP synthesis',true),op('B','Site of protein synthesis'),op('C','Site of lipid synthesis'),op('D','Site of photosynthesis')],'Mitochondria = powerhouse; produces ATP via oxidative phosphorylation.'),
    q(12,'Cristae are:','Mitochondria',[op('A','Inner membrane infoldings',true),op('B','Outer membrane infoldings'),op('C','Matrix spaces'),op('D','Membrane proteins')],'Cristae are infoldings of the inner mitochondrial membrane, increasing surface area for ETC.'),
    q(13,'Mitochondrial matrix contains:','Mitochondria',[op('A','Circular DNA, ribosomes, enzymes',true),op('B','Linear DNA only'),op('C','No DNA'),op('D','Only lipids')],'Mitochondria have their own circular DNA, 70S ribosomes, and Krebs cycle enzymes.'),
    q(14,'Chloroplast function:','Chloroplast',[op('A','Respiration'),op('B','Photosynthesis',true),op('C','Protein synthesis'),op('D','Digestion')],'Chloroplasts perform photosynthesis using chlorophyll and other pigments.'),
    q(15,'Grana in chloroplast are:','Chloroplast',[op('A','Only lipids'),op('B','Stacks of thylakoids',true),op('C','Stroma'),op('D','Outer membrane')],'Grana are stacks of thylakoid membranes; light reactions occur here.'),
    q(16,'Stroma is:','Chloroplast',[op('A','Fluid-filled space outside thylakoids',true),op('B','Thylakoid membrane'),op('C','Chloroplast envelope'),op('D','Pigment complex')],'Stroma is the fluid matrix where the Calvin cycle (dark reactions) occurs.'),
    q(17,'Endoplasmic reticulum with ribosomes:','ER',[op('A','Smooth ER'),op('B','Rough ER',true),op('C','Both'),op('D','Neither')],'Rough ER has ribosomes on its surface (for protein synthesis). Smooth ER lacks ribosomes.'),
    q(18,'SER function:','ER',[op('A','Protein synthesis'),op('B','Lipid synthesis and detoxification',true),op('C','Photosynthesis'),op('D','Digestion')],'Smooth ER synthesizes lipids, steroids, and detoxifies drugs/poisons.'),
    q(19,'Golgi apparatus function:','Golgi',[op('A','Energy production'),op('B','Packaging and modification of proteins',true),op('C','Protein synthesis'),op('D','Digestion')],'Golgi modifies, sorts, and packages proteins; also forms lysosomes.'),
    q(20,'Lysosomes contain:','Lysosomes',[op('A','Carbohydrates'),op('B','Hydrolytic enzymes',true),op('C','ATP'),op('D','Nucleic acids')],'Lysosomes have hydrolytic enzymes (acid hydrolases) for intracellular digestion.'),
    q(21,'Ribosome function:','Ribosomes',[op('A','Lipid synthesis'),op('B','Protein synthesis',true),op('C','Carbohydrate synthesis'),op('D','Nucleic acid synthesis')],'Ribosomes are sites of protein synthesis; composed of rRNA + proteins.'),
    q(22,'Centriole structure:','Centrosome',[op('A','9+2 arrangement'),op('B','9+0 arrangement',true),op('C','9+1 arrangement'),op('D','10+0 arrangement')],'Centrioles have 9 triplet microtubules arranged in 9+0 fashion.'),
    q(23,'Cilia and flagella:','Cilia/Flagella',[op('A','9+2 microtubule arrangement',true),op('B','9+0 arrangement'),op('C','7+2 arrangement'),op('D','No microtubules')],'Cilia and flagella have 9+2 arrangement (9 peripheral doublets + 2 central singlet microtubules).'),
    q(24,'Cilia basal body:','Cilia/Flagella',[op('A','9+2 arrangement'),op('B','9+0 arrangement',true),op('C','No microtubules'),op('D','Random arrangement')],'Basal body has 9+0 triplet microtubule arrangement; anchors cilia/flagella.'),
    q(25,'Microfilaments are:','Cytoskeleton',[op('A','Actin filaments',true),op('B','Microtubules'),op('C','Intermediate filaments'),op('D','Flagella')],'Microfilaments = actin filaments, involved in cell movement and contraction.'),
    q(26,'Middle lamella is:','Cell Wall',[op('A','Pectin-rich layer between cells',true),op('B','Cellulose layer'),op('C','Lignin layer'),op('D','Protein layer')],'Middle lamella = pectin layer that cements adjacent plant cells.'),
    q(27,'Plasmodesmata:','Cell Wall',[op('A','For cell-to-cell communication',true),op('B','For water absorption'),op('C','For photosynthesis'),op('D','For support')],'Plasmodesmata are cytoplasmic bridges through the cell wall for transport between cells.'),
    q(28,'Vacuole in plant cells:','Vacuole',[op('A','Small and temporary'),op('B','Large and central (tonoplast)',true),op('C','Absent'),op('D','Equal to animal cells')],'Plant cells have a large central vacuole with tonoplast membrane; maintains turgor.'),
    q(29,'Peroxisome function:','Peroxisomes',[op('A','ATP synthesis'),op('B','Hydrogen peroxide metabolism',true),op('C','Protein synthesis'),op('D','DNA replication')],'Peroxisomes contain catalase to break down H2O2; also involved in photorespiration.'),
    q(30,'Prokaryotic flagella:','Prokaryotic',[op('A','9+2 microtubule arrangement'),op('B','Bacterial flagellin protein',true),op('C','Covered by membrane'),op('D','Same as eukaryotic flagella')],'Bacterial flagella are made of flagellin protein, not microtubules, and rotate like a propeller.')
  ]
});

// Chapter 9: Biomolecules
chapters.push({ num:9, name:'Biomolecules', slug:'biomolecules', topics:'Carbohydrates, Proteins, Lipids, Nucleic Acids, Enzymes',
  desc:'30 NEET-level MCQs on Biomolecules covering carbohydrates, proteins, lipids, nucleic acids, vitamins, enzymes, and metabolism.',
  qs:[
    q(1,'Which is the most abundant organic molecule in plants?','Carbohydrates',[op('A','Cellulose',true),op('B','Starch'),op('C','Glycogen'),op('D','Chitin')],'Cellulose is the most abundant biomass on Earth, a structural polysaccharide of beta-glucose.'),
    q(2,'Monosaccharide formula:','Carbohydrates',[op('A','(CH2O)n',true),op('B','C6H12O6'),op('C','C12H22O11'),op('D','(C6H10O5)n')],'General formula (CH2O)n for monosaccharides. Glucose is C6H12O6.'),
    q(3,'Reducing sugar that is not a monosaccharide:','Carbohydrates',[op('A','Glucose'),op('B','Fructose'),op('C','Maltose',true),op('D','Cellulose')],'Maltose (disaccharide) is a reducing sugar. Cellulose is non-reducing.'),
    q(4,'Inulin is a polymer of:','Carbohydrates',[op('A','Glucose'),op('B','Fructose',true),op('C','Galactose'),op('D','Mannose')],'Inulin (fructan) is a polymer of fructose, found in dahlia, chicory.'),
    q(5,'Sucrose composition:','Carbohydrates',[op('A','Glucose + Glucose'),op('B','Glucose + Fructose',true),op('C','Glucose + Galactose'),op('D','Fructose + Galactose')],'Sucrose = alpha-D-glucose + beta-D-fructose (glycosidic bond).'),
    q(6,'Amino acids are linked by:','Proteins',[op('A','Glycosidic bond'),op('B','Peptide bond',true),op('C','Phosphodiester bond'),op('D','Hydrogen bond')],'Peptide bond (-CO-NH-) links adjacent amino acids in a protein chain.'),
    q(7,'Essential amino acids:','Proteins',[op('A','Cannot be synthesized by the body',true),op('B','Synthesized by the body'),op('C','Not needed'),op('D','Only in plants')],'Essential amino acids (9) must be obtained from diet; e.g., valine, leucine, lysine.'),
    q(8,'Primary structure of protein is:','Proteins',[op('A','Sequence of amino acids',true),op('B','Alpha-helix'),op('C','Beta-sheet'),op('D','Quaternary arrangement')],'Primary structure = linear sequence of amino acids. Secondary = helix/sheet.'),
    q(9,'Alpha-helix maintained by:','Proteins',[op('A','Ionic bonds'),op('B','Hydrogen bonds',true),op('C','Disulfide bonds'),op('D','Hydrophobic interactions')],'Alpha-helix is stabilized by hydrogen bonds between carbonyl O and amide H.'),
    q(10,'Enzymes are:','Enzymes',[op('A','Carbohydrates'),op('B','Proteins (mostly)',true),op('C','Lipids'),op('D','Nucleic acids')],'Most enzymes are proteins; some ribozymes (e.g., rRNA) are RNA-based.'),
    q(11,'Apoenzyme + cofactor =:','Enzymes',[op('A','Proenzyme'),op('B','Holoenzyme',true),op('C','Isoenzyme'),op('D','Substrate')],'Holoenzyme = apoenzyme (protein part) + cofactor (non-protein part).'),
    q(12,'Lock and key model given by:','Enzymes',[op('A','Koshland'),op('B','Emil Fischer',true),op('C','Michaelis'),op('D','Menten')],'Lock and key model (Emil Fischer): substrate fits precisely into the enzyme active site.'),
    q(13,'Induced fit model:','Enzymes',[op('A','Active site is rigid'),op('B','Active site changes shape on substrate binding',true),op('C','No binding occurs'),op('D','Active site is destroyed')],'Induced fit (Koshland): active site conformation changes upon substrate binding.'),
    q(14,'Enzymes speed up reactions by:','Enzymes',[op('A','Increasing activation energy'),op('B','Lowering activation energy',true),op('C','Raising temperature'),op('D','Changing pH')],'Enzymes lower activation energy, making reactions proceed faster.'),
    q(15,'Competitive inhibitor:','Enzymes',[op('A','Binds to allosteric site'),op('B','Binds to active site',true),op('C','Binds to substrate'),op('D','Irreversible inhibition')],'Competitive inhibitor resembles substrate and binds to the active site.'),
    q(16,'DNA nucleotides:','Nucleic Acids',[op('A','A, T, G, C',true),op('B','A, U, G, C'),op('C','A, T, G, U'),op('D','A, U, T, C')],'DNA has A, T, G, C. RNA has A, U, G, C.'),
    q(17,'Phosphodiester bond connects:','Nucleic Acids',[op('A','Sugar-base'),op('B','Nucleotides in a strand',true),op('C','Two DNA strands'),op('D','Amino acids')],'Phosphodiester bond: 5\' carbon of one sugar to 3\' carbon of next nucleotide.'),
    q(18,'Chargaff rule:','Nucleic Acids',[op('A','A=U, G=C in RNA'),op('B','A=T, G=C in DNA',true),op('C','A=C, G=T'),op('D','A=G, C=T')],'Chargaff rule: A = T and G = C in double-stranded DNA.'),
    q(19,'DNA double helix discovered by:','Nucleic Acids',[op('A','Watson and Crick',true),op('B','Mendel'),op('C','Darwin'),op('D','Morgan')],'Watson and Crick (1953) proposed the double helix DNA structure.'),
    q(20,'Which vitamin is water-soluble?','Vitamins',[op('A','Vitamin A'),op('B','Vitamin B-complex',true),op('C','Vitamin D'),op('D','Vitamin K')],'B-complex and C are water-soluble; A, D, E, K are fat-soluble.'),
    q(21,'Beri-beri caused by deficiency of:','Vitamins',[op('A','Vitamin A'),op('B','Vitamin B1 (Thiamine)',true),op('C','Vitamin C'),op('D','Vitamin D')],'Beri-beri = thiamine (B1) deficiency. Night blindness = A. Scurvy = C.'),
    q(22,'Scurvy causes:','Vitamins',[op('A','Rickets'),op('B','Bleeding gums',true),op('C','Pellagra'),op('D','Anemia')],'Scurvy (vitamin C deficiency) causes bleeding gums, swollen joints, slow wound healing.'),
    q(23,'Cholesterol is a:','Lipids',[op('A','Simple lipid'),op('B','Steroid',true),op('C','Phospholipid'),op('D','Glycolipid')],'Cholesterol is a steroid (ring structure), a component of cell membranes.'),
    q(24,'Phospholipid bilayer:','Lipids',[op('A','Hydrophilic heads inward'),op('B','Hydrophilic heads outward, tails inward',true),op('C','All hydrophilic'),op('D','All hydrophobic')],'Phospholipid bilayer: hydrophilic phosphate heads face aqueous environment; hydrophobic tails face each other.'),
    q(25,'Trans fat is:','Lipids',[op('A','Unsaturated',true),op('B','Saturated'),op('C','Not a lipid'),op('D','A protein')],'Trans fats are unsaturated fats with trans double bonds; linked to heart disease.'),
    q(26,'Glycosidic bond in carbohydrates:','Carbohydrates',[op('A','Between amino acids'),op('B','Between monosaccharides',true),op('C','Between nucleotides'),op('D','Between fatty acids')],'Glycosidic bond links monosaccharides in disaccharides and polysaccharides.'),
    q(27,'Starch vs glycogen branching:','Carbohydrates',[op('A','Both unbranched'),op('B','Glycogen more branched',true),op('C','Starch more branched'),op('D','Both equally branched')],'Glycogen (animal) is more highly branched than starch (plant), both polymers of glucose.'),
    q(28,'Km value of enzyme:','Enzymes',[op('A','Increases with inhibitor'),op('B','Substrate concentration at half Vmax',true),op('C','Maximum velocity'),op('D','Enzyme concentration')],'Km = substrate concentration at half Vmax; measures enzyme-substrate affinity.'),
    q(29,'Enzyme catalytic cycle uses:','Enzymes',[op('A','Lock and key'),op('B','Activation energy lowering',true),op('C','Heat energy'),op('D','Electric current')],'Enzymes remain unchanged after reaction and lower activation energy repeatedly.'),
    q(30,'Activation energy is:','Enzymes',[op('A','Energy released by reaction'),op('B','Minimum energy to start reaction',true),op('C','Heat of reaction'),op('D','Binding energy')],'Activation energy is the minimum energy required for a chemical reaction to begin.')
  ]
});

// Chapter 10: Cell Cycle & Cell Division (data already exists as manual file)
chapters.push({ num:10, name:'Cell Cycle & Cell Division', slug:'cell-cycle-and-cell-division', topics:'Cell Cycle, Mitosis, Meiosis, Significance',
  desc:'30 NEET-level MCQs on Cell Cycle and Cell Division covering phases, mitosis, meiosis, and their biological significance.',
  qs:[
    q(1,'Cell cycle duration varies; fastest in:','Cell Cycle',[op('A','Nerve cells'),op('B','Skin cells',true),op('C','Muscle cells'),op('D','Bone cells')],'Skin cells divide rapidly (~12h). Nerve cells rarely divide.'),
    q(2,'Interphase accounts for:','Cell Cycle',[op('A','10% of cell cycle'),op('B','95% of cell cycle',true),op('C','50% of cell cycle'),op('D','5% of cell cycle')],'Interphase is 95% of cell cycle; actual division (M-phase) is only 5%.'),
    q(3,'DNA replication happens in:','Cell Cycle',[op('A','G1 phase'),op('B','S phase',true),op('C','G2 phase'),op('D','M phase')],'S (synthetic) phase: DNA content doubles from 2C to 4C.'),
    q(4,'G1 phase is marked by:','Cell Cycle',[op('A','DNA replication'),op('B','Cell growth and organelle production',true),op('C','Cell division'),op('D','Chromosome condensation')],'G1 phase: cell growth, protein/organelle synthesis, prepares for S phase.'),
    q(5,'Prophase I substage where crossing over occurs:','Meiosis',[op('A','Leptotene'),op('B','Pachytene',true),op('C','Diplotene'),op('D','Diakinesis')],'Crossing over (recombination) occurs in pachytene of prophase I.'),
    q(6,'Synapsis occurs in:','Meiosis',[op('A','Leptotene'),op('B','Zygotene',true),op('C','Pachytene'),op('D','Diplotene')],'Synapsis (pairing of homologous chromosomes) occurs in zygotene.'),
    q(7,'Chiasmata visible in:','Meiosis',[op('A','Leptotene'),op('B','Zygotene'),op('C','Pachytene'),op('D','Diplotene',true)],'Chiasmata (crossing over points) become visible in diplotene as homologous chromosomes separate.'),
    q(8,'Metaphase I arrangement:','Meiosis',[op('A','Chromosomes align singly'),op('B','Bivalents align at equatorial plate',true),op('C','Univalents'),op('D','Random alignment')],'Bivalents (tetrads) align at the equator during metaphase I.'),
    q(9,'Anaphase I separates:','Meiosis',[op('A','Sister chromatids'),op('B','Homologous chromosomes',true),op('C','Non-homologous chromosomes'),op('D','Centromeres')],'Anaphase I: homologous chromosomes separate; sister chromatids stay together.'),
    q(10,'Meiosis II is similar to:','Meiosis',[op('A','Meiosis I'),op('B','Mitosis',true),op('C','Interphase'),op('D','Cytokinesis')],'Meiosis II is similar to mitosis: sister chromatids separate.'),
    q(11,'Meiosis produces:','Meiosis',[op('A','2 diploid cells'),op('B','4 haploid cells',true),op('C','2 haploid cells'),op('D','4 diploid cells')],'Meiosis: one diploid cell -> 4 haploid cells (gametes).'),
    q(12,'Mitosis produces:','Mitosis',[op('A','4 haploid cells'),op('B','2 diploid cells',true),op('C','2 haploid cells'),op('D','4 diploid cells')],'Mitosis: one diploid -> two genetically identical diploid daughter cells.'),
    q(13,'Sister chromatids separate in:','Mitosis',[op('A','Prophase'),op('B','Metaphase'),op('C','Anaphase',true),op('D','Telophase')],'Anaphase: centromeres split, sister chromatids pulled to opposite poles.'),
    q(14,'Spindle fibers attach to:','Mitosis',[op('A','Telomere'),op('B','Centromere (kinetochore)',true),op('C','Chromatid arms'),op('D','Nuclear envelope')],'Spindle fibers attach to the kinetochore at the centromere.'),
    q(15,'Cleavage furrow in:','Cytokinesis',[op('A','Plant cells'),op('B','Animal cells',true),op('C','Both'),op('D','Neither')],'Animal cells: cleavage furrow; plant cells: cell plate formation.'),
    q(16,'Cell plate formation occurs in:','Cytokinesis',[op('A','Animal cells'),op('B','Plant cells',true),op('C','Fungi'),op('D','Bacteria')],'Cell plate (from Golgi vesicles) forms at the equator, developing into the new cell wall.'),
    q(17,'Spindle poison that arrests mitosis:','Mitosis',[op('A','Ethidium bromide'),op('B','Colchicine',true),op('C','Formalin'),op('D','Alcohol')],'Colchicine prevents spindle formation, arresting cells at metaphase; used for polyploidy.'),
    q(18,'G0 phase is:','Cell Cycle',[op('A','Dividing phase'),op('B','Quiescent/resting phase',true),op('C','DNA synthesis'),op('D','Cell death')],'G0 phase: cells exit the cell cycle and become non-dividing (e.g., neurons).'),
    q(19,'Checkpoint at G1/S:','Cell Cycle',[op('A','Checks DNA damage before replication',true),op('B','Checks spindle assembly'),op('C','Checks chromosome alignment'),op('D','No function')],'G1/S checkpoint: checks for DNA damage and favorable conditions before DNA synthesis.'),
    q(20,'Cytokinesis in plants:','Cytokinesis',[op('A','Centrifugal'),op('B','Centripetal',true),op('C','No cytokinesis'),op('D','Multiple fission')],'Plant cytokinesis is centripetal (cell plate grows inward from center to periphery).'),
    q(21,'Cytokinesis in animals:','Cytokinesis',[op('A','Centripetal'),op('B','Centrifugal',true),op('C','No furrow'),op('D','Via cell plate')],'Animal cytokinesis is centrifugal (cleavage furrow deepens from periphery to center).'),
    q(22,'Nucleolus disappears in:','Mitosis',[op('A','Anaphase'),op('B','Prophase',true),op('C','Metaphase'),op('D','Telophase')],'Nucleolus and nuclear envelope disappear during prophase.'),
    q(23,'Mitosis maintains:','Mitosis',[op('A','Genetic variability'),op('B','Chromosome number constant',true),op('C','Haploid number'),op('D','DNA recombination')],'Mitosis produces genetically identical cells, maintaining constant chromosome number.'),
    q(24,'Meiosis reduces:','Meiosis',[op('A','Cytoplasm'),op('B','Chromosome number by half',true),op('C','Cell size'),op('D','Organelle number')],'Meiosis reduces diploid (2n) to haploid (n) by one round of DNA replication followed by two divisions.'),
    q(25,'Equational division:','Mitosis',[op('A','Meiosis'),op('B','Mitosis',true),op('C','Both'),op('D','Neither')],'Mitosis is equational (daughter cells have same chromosome number as parent).'),
    q(26,'Reductional division:','Meiosis',[op('A','Mitosis'),op('B','Meiosis I',true),op('C','Meiosis II'),op('D','Both mitosis and meiosis')],'Meiosis I is reductional (homologs separate, reducing ploidy). Meiosis II is equational.'),
    q(27,'Endomitosis leads to:','Mitosis',[op('A','Diploid cells'),op('B','Polyploid cells',true),op('C','Haploid cells'),op('D','No change')],'Endomitosis: DNA replication without cell division, causing polyploidy (e.g., liver cells).'),
    q(28,'Recombination nodules in:','Meiosis',[op('A','Pachytene',true),op('B','Leptotene'),op('C','Diplotene'),op('D','Diakinesis')],'Recombination nodules facilitate crossing over in pachytene.'),
    q(29,'Terminalization of chiasmata:','Meiosis',[op('A','Leptotene'),op('B','Zygotene'),op('C','Diakinesis',true),op('D','Metaphase I')],'Chiasmata move toward chromosome ends (terminalization) during diakinesis.'),
    q(30,'Synaptonemal complex formed in:','Meiosis',[op('A','Zygotene',true),op('B','Pachytene'),op('C','Diplotene'),op('D','Leptotene')],'Synaptonemal complex forms between homologous chromosomes during zygotene for synapsis.')
  ]
});

var ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function genHTML(ch) {
  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>NEET Biology Chapter ' + ch.num + ': ' + esc(ch.name) + ' MCQ with Answers</title>\n';
  h += '    <meta name="description" content="Free NEET Biology Chapter ' + ch.num + ' (' + esc(ch.name) + ') MCQ with solutions. 30+ practice questions.\">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="../logo.png">\n';
  h += '    <link rel="canonical" href="https://vlymbooq.qzz.io/neet/chapters/biology-chapter-' + ch.num + '-' + ch.slug + '.html">\n';
  h += '    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"NEET Biology Chapter ' + ch.num + ': ' + esc(ch.name) + ' MCQ","description":"Free NEET Biology Chapter ' + ch.num + ' ' + esc(ch.name) + ' MCQ with solutions. 30+ practice questions.","url":"https://vlymbooq.qzz.io/neet/chapters/biology-chapter-' + ch.num + '-' + ch.slug + '.html","educationalLevel":"Competitive Exam","audience":{"@type":"EducationalAudience","educationalRole":"student"},"publisher":{"@type":"Organization","name":"vlymbooq","url":"https://vlymbooq.qzz.io"}}</script>\n';
  h += '    <style>\n';
  h += '        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n';
  h += '        *{margin:0;padding:0;box-sizing:border-box}\n';
  h += '        :root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--radius:12px}\n';
  h += '        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text)}\n';
  h += '        a{color:var(--purple);text-decoration:none}\n';
  h += '        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);border-bottom:1px solid var(--border)}\n';
  h += '        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n';
  h += '        .brand{display:flex;align-items:center;gap:8px}\n';
  h += '        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}\n';
  h += '        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n';
  h += '        .nav-links{display:flex;gap:2px;flex-wrap:wrap}\n';
  h += '        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}\n';
  h += '        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n';
  h += '        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n';
  h += '        .container{max-width:900px;margin:0 auto;padding:24px}\n';
  h += '        .chapter-header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:24px}\n';
  h += '        .chapter-header .badge{display:inline-flex;padding:4px 12px;border-radius:100px;background:rgba(52,211,153,.12);color:var(--emerald);font-size:.75em;font-weight:600;margin-bottom:8px}\n';
  h += '        .chapter-header h1{font-size:1.6em;font-weight:900;margin-bottom:8px;line-height:1.2}\n';
  h += '        .chapter-header .sub{color:var(--text-sec);font-size:.9em;line-height:1.6}\n';
  h += '        .chapter-header .meta{display:flex;gap:12px;margin-top:10px;flex-wrap:wrap}\n';
  h += '        .chapter-header .meta span{font-size:.8em;color:var(--text-muted)}\n';
  h += '        .q-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}\n';
  h += '        .q-card .q-num{font-size:.78em;color:var(--text-muted);margin-bottom:4px;display:flex;justify-content:space-between}\n';
  h += '        .q-card .q-topic{font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(167,139,250,.1);color:var(--purple)}\n';
  h += '        .q-card .q-text{font-size:.93em;margin-bottom:10px;line-height:1.6;font-weight:500}\n';
  h += '        .q-card .q-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}\n';
  h += '        @media(max-width:500px){.q-card .q-opts{grid-template-columns:1fr}}\n';
  h += '        .q-card .q-opt{padding:8px 12px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.82em;transition:all .15s}\n';
  h += '        .q-card .q-opt:hover{border-color:rgba(255,255,255,.15)}\n';
  h += '        .q-card .q-opt.correct{border-color:var(--emerald);background:rgba(52,211,153,.1)}\n';
  h += '        .q-card .q-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}\n';
  h += '        .q-card .q-opt.disabled{pointer-events:none;opacity:.7}\n';
  h += '        .q-card .q-soln{display:none;margin-top:10px;padding:10px;background:rgba(139,92,246,.06);border-radius:8px;font-size:.82em;color:var(--text-sec);line-height:1.5}\n';
  h += '        .q-card .q-soln.show{display:block}\n';
  h += '        .q-card .q-soln strong{color:var(--emerald)}\n';
  h += '        .q-card .q-result{font-size:.78em;font-weight:600;margin-top:6px}\n';
  h += '        .q-card .q-result.correct{color:var(--emerald)}\n';
  h += '        .q-card .q-result.wrong{color:#ef4444}\n';
  h += '        .ch-list{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}\n';
  h += '        .ch-list a{padding:5px 12px;border-radius:100px;font-size:.8em;border:1px solid var(--border);color:var(--text-sec);transition:all .2s}\n';
  h += '        .ch-list a:hover{border-color:var(--purple);color:var(--purple)}\n';
  h += '        .ch-list a.active{background:rgba(167,139,250,.12);border-color:var(--purple);color:var(--purple)}\n';
  h += '        .pdf-dl{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);border-radius:var(--radius);margin:20px 0}\n';
  h += '        .pdf-dl button{padding:8px 20px;border-radius:100px;background:rgba(52,211,153,.12);color:var(--emerald);font-weight:600;font-size:.82em;border:none;cursor:pointer}\n';
  h += '        .pdf-dl button:hover{background:rgba(52,211,153,.2)}\n';
  h += '        .score-bar{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}\n';
  h += '        .score-bar .score{font-size:1.3em;font-weight:800;color:var(--purple)}\n';
  h += '        .score-bar .score .denom{color:var(--text-muted);font-weight:400}\n';
  h += '        .score-bar button{padding:6px 16px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-sec);border:1px solid var(--border);cursor:pointer;font-size:.78em}\n';
  h += '        @media print{.nav,.score-bar,.pdf-dl,.ch-list{display:none}.q-card .q-soln{display:block!important}}\n';
  h += '    </style>\n</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand"><img src="../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../index.html">Home</a><a href="../dashboard.html">Dashboard</a><a href="../community.html">Community</a><a href="../neet/index.html" class="active">NEET</a><a href="../jee/index.html">JEE</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  h += '        <div class="ch-list">\n';
  for (var i = 1; i <= 10; i++) {
    if (i === ch.num) h += '            <a href="biology-chapter-' + i + '-' + chapters.filter(function(c){return c.num===i})[0].slug + '.html" class="active">Ch ' + i + '</a>\n';
    else {
      var c = chapters.filter(function(cv){return cv.num===i})[0];
      if (c) h += '            <a href="biology-chapter-' + i + '-' + c.slug + '.html">Ch ' + i + '</a>\n';
      else h += '            <a href="#">Ch ' + i + '</a>\n';
    }
  }
  h += '        </div>\n';
  h += '        <div class="chapter-header">\n';
  h += '            <div class="badge">NEET Biology &middot; NCERT Class 11</div>\n';
  h += '            <h1>Chapter ' + ch.num + ': ' + esc(ch.name) + ' &mdash; MCQ with Answers</h1>\n';
  h += '            <div class="sub">' + esc(ch.desc) + '</div>\n';
  h += '            <div class="meta"><span>30 Questions</span><span>30 Minutes</span><span>+4, -1 Marking</span><span>NCERT Based</span></div>\n';
  h += '        </div>\n';
  h += '        <div class="score-bar"><div><span class="score" id="c-count">0</span><span class="denom"> / 30</span></div><div><span id="acc-pct" style="font-weight:700;color:var(--emerald)">0%</span></div><button onclick="resetQ()">&#x1f504; Reset</button></div>\n';
  h += '        <div id="q-cont"></div>\n';
  h += '        <div class="pdf-dl"><div style="flex:1"><strong>&#x1f4c4; Chapter ' + ch.num + ' PDF</strong><br><span style="font-size:.8em;color:var(--text-muted)">Download for offline practice</span></div><button onclick="window.print()">&#x2b07; Download PDF</button></div>\n';
  h += '    </div>\n';
  h += '    <script>\n';
  h += '    var qs = ' + JSON.stringify(ch.qs) + ';\n';
  h += '    var an={},cc=0;\n';
  h += '    function getCL(q){for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)return q.opts[i].l+". "+q.opts[i].t}return""}\n';
  h += '    function rd(){var c=document.getElementById("q-cont"),h="";for(var i=0;i<qs.length;i++){var q=qs[i],o="";for(var j=0;j<q.opts.length;j++){o+=\'<div class="q-opt" data-q="\'+q.id+\'" data-i="\'+j+\'" onclick="so(\'+q.id+","+j+\')">\'+q.opts[j].l+". "+q.opts[j].t+"</div>"}h+=\'<div class="q-card" id="q-\'+q.id+\'"><div class="q-num"><span>Question \'+(i+1)+" of "+qs.length+"</span><span class=\"q-topic\">"+q.topic+"</span></div><div class=\"q-text\">"+q.text+"</div><div class=\"q-opts\">"+o+\'</div><div class="q-soln" id="sn-\'+q.id+\'"><strong>\\u2713 Correct: </strong>\'+getCL(q)+".<br>"+q.sol+\'</div><div class="q-result" id="r-\'+q.id+\'"></div></div>}c.innerHTML=h;uc()}\n';
  h += '    function so(id,idx){if(an[id])return;an[id]=true;var q=qs.filter(function(x){return x.id===id})[0];var os=document.querySelectorAll("#q-"+id+" .q-opt");var cr=q.opts[idx].c;for(var i=0;i<os.length;i++)os[i].classList.add("disabled");if(cr){os[idx].classList.add("correct");document.getElementById("r-"+id).textContent="+4 Correct!";cc++;}else{os[idx].classList.add("wrong");for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)os[i].classList.add("correct")}document.getElementById("r-"+id).textContent="-1 Wrong"}document.getElementById("sn-"+id).classList.add("show");uc()}\n';
  h += '    function uc(){document.getElementById("c-count").textContent=cc;var t=Object.keys(an).length;document.getElementById("acc-pct").textContent=(t>0?Math.round(cc/t*100):0)+"%"}\n';
  h += '    function resetQ(){if(!confirm("Reset?"))return;an={};cc=0;document.querySelectorAll(".q-card").forEach(function(c){c.querySelectorAll(".q-opt").forEach(function(e){e.className="q-opt"});c.querySelector(".q-soln").classList.remove("show");c.querySelector(".q-result").className="q-result";c.querySelector(".q-result").textContent=""});uc()}\n';
  h += '    rd();\n';
  h += '    </script>\n</body>\n</html>';
  return h;
}

var outDir = path.join(ROOT, 'neet', 'chapters');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});

for (var i = 0; i < chapters.length; i++) {
  var ch = chapters[i];
  var fp = path.join(outDir, 'biology-chapter-' + ch.num + '-' + ch.slug + '.html');
  fs.writeFileSync(fp, genHTML(ch), 'utf-8');
  console.log('Wrote: ' + fp);
}

console.log('Generated ' + chapters.length + ' chapter pages');
