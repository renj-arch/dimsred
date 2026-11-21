// Language/literature optional data — batch C (7 subjects)
module.exports = [
  {
    slug: 'sanskrit', name: 'Sanskrit', family: 'Indo-Aryan', script: 'Devanagari script',
    region: 'pan-India (liturgical and scholarly)', status: 'It is one of the original Eighth Schedule languages (1950) and was declared a classical language in 2005', scheduleShort: '1950',
    origin: 'Sanskrit is the oldest attested Indo-Aryan language, with Vedic literature going back to the second millennium BCE. Panini’s Ashtadhyayi standardised classical Sanskrit.',
    periods: [
      { name: 'Vedic period', desc: 'Rigveda, Samaveda, Yajurveda and Atharvaveda; Brahmanas, Aranyakas and Upanishads.' },
      { name: 'Epic period', desc: 'Ramayana and Mahabharata; the Bhagavad Gita.' },
      { name: 'Classical period', desc: 'Kalidasa, Bhasa, Shudraka and Bhavabhuti; court poetry and drama.' },
      { name: 'Scholarly and modern period', desc: 'Grammar, poetics, philosophy, science and modern Sanskrit writing.' }
    ],
    movements: ['Vedic literature', 'Classical Sanskrit literature', 'Bhakti and court poetry', 'Modern Sanskrit movement'],
    authors: [
      { name: 'Panini', note: 'Grammarian; author of the Ashtadhyayi.' },
      { name: 'Kalidasa', note: 'Classical poet and playwright; Abhijnanashakuntalam and Meghaduta.' },
      { name: 'Bhasa', note: 'Early Sanskrit playwright; Svapnavasavadatta.' },
      { name: 'Banabhatta', note: 'Prose writer; Kadambari and Harshacharita.' },
      { name: 'Anandavardhana', note: 'Poetician; Dhvanyaloka.' }
    ],
    works: [
      { title: 'Abhijnanashakuntalam', author: 'Kalidasa', note: 'Classical drama of love and recognition.' },
      { title: 'Ashtadhyayi', author: 'Panini', note: 'Foundational grammar of Sanskrit.' },
      { title: 'Kadambari', author: 'Banabhatta', note: 'Classical prose romance.' },
      { title: 'Dhvanyaloka', author: 'Anandavardhana', note: 'Treatise on suggestion (dhvani) in poetry.' }
    ],
    criticism: 'the rasa, dhvani, alamkara, guna and riti schools, beginning with Bharata’s Natyashastra',
    sources: ['Sahitya Akademi histories of Sanskrit literature', 'Encyclopaedia of Indian Literature', 'A.B. Keith, A History of Sanskrit Literature', 'University syllabi and prescribed texts']
  },
  {
    slug: 'santali', name: 'Santali', family: 'Munda (Austroasiatic)', script: 'Ol Chiki script',
    region: 'Jharkhand, West Bengal, Odisha and Bihar', status: 'It was added to the Eighth Schedule by the 92nd Constitutional Amendment Act, 2003', scheduleShort: '2003',
    origin: 'Santali is a Munda language of the Austroasiatic family. It has a rich oral tradition; the Ol Chiki script was invented by Raghunath Murmu in 1925, and modern written literature developed in the 20th century.',
    periods: [
      { name: 'Oral period', desc: 'Folk songs, creation myths and narrative poems.' },
      { name: 'Early written period (20th c.)', desc: 'Ol Chiki script, primers and early publications.' },
      { name: 'Modern period (mid-20th c.–present)', desc: 'Poetry, drama, fiction and Sahitya Akademi recognition.' }
    ],
    movements: ['Oral tradition', 'Ol Chiki movement', 'Modern Santali movement'],
    authors: [
      { name: 'Raghunath Murmu', note: 'Inventor of the Ol Chiki script and pioneer of modern Santali writing.' },
      { name: 'Sadhu Ramchand Murmu', note: 'Santali poet and writer.' },
      { name: 'Santali Sahitya Akademi writers', note: 'Modern Santali poets, dramatists and fiction writers.' }
    ],
    works: [
      { title: 'Santali folk songs', author: 'Oral tradition', note: 'Traditional songs of the Santal community.' },
      { title: 'Ol Chiki primers', author: 'Raghunath Murmu', note: 'Early texts that established the Ol Chiki script.' },
      { title: 'Santali poetry', author: 'Sadhu Ramchand Murmu', note: 'Twentieth-century Santali poetry.' },
      { title: 'Modern Santali drama', author: 'Modern Santali writers', note: 'Twentieth-century drama.' }
    ],
    criticism: 'oral-formulaic study of folk literature, socio-cultural criticism and modern stylistic analysis',
    sources: ['Sahitya Akademi Santali literature resources', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Ol Chiki and Santali literary histories'],
    sample: {
      passage: 'ᱥᱟᱱᱛᱟᱲ ᱯᱟᱹᱨᱥᱤ ᱫᱚ ᱥᱟᱱᱛᱟᱲ ᱦᱚᱲᱠᱚ ᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱠᱟᱱᱟ ᱾ ᱱᱚᱶᱟ ᱯᱟᱹᱨᱥᱤ ᱫᱚ ᱚᱞ ᱪᱤᱠᱤ ᱛᱮ ᱚᱞᱚᱜᱼᱟ ᱾ ᱥᱟᱱᱛᱟᱲ ᱠᱚᱣᱟᱜ ᱢᱟᱨᱟᱝ ᱯᱚᱨᱚᱵᱽ ᱫᱚ ᱥᱚᱦᱨᱟᱭ ᱠᱟᱱᱟ ᱾',
      english: 'Santali is the language of the Santal people. This language is written in the Ol Chiki script. The major festival of the Santals is Sohrai.'
    }
  },
  {
    slug: 'sindhi', name: 'Sindhi', family: 'Indo-Aryan', script: 'Perso-Arabic script (also Devanagari in India)',
    region: 'Sindh (now Pakistan) and the Sindhi diaspora in India', status: 'It was added to the Eighth Schedule by the 21st Constitutional Amendment Act, 1967', scheduleShort: '1967',
    origin: 'Sindhi is an Indo-Aryan language with a literary tradition going back to the Sufi poets of Sindh. After Partition, Sindhi literature continued in India in Perso-Arabic and Devanagari scripts.',
    periods: [
      { name: 'Early period (16th–18th c.)', desc: 'Shah Abdul Latif Bhittai and the Sufi poetic tradition.' },
      { name: 'Nineteenth–early twentieth century', desc: 'Print, prose and the Sindhi renaissance.' },
      { name: 'Modern period (20th c.–present)', desc: 'Partition literature, fiction, poetry and diaspora writing.' }
    ],
    movements: ['Sufi poetry', 'Sindhi renaissance', 'Progressive movement'],
    authors: [
      { name: 'Shah Abdul Latif Bhittai', note: '18th-century Sufi poet; Sur Shah Latif.' },
      { name: 'Sachal Sarmast', note: 'Sufi poet.' },
      { name: 'Shaikh Ayaz', note: 'Modern Sindhi poet.' },
      { name: 'Popati Hiranandani', note: 'Sindhi writer and feminist voice.' }
    ],
    works: [
      { title: 'Sur Shah Latif', author: 'Shah Abdul Latif Bhittai', note: 'Sufi poetry collection.' },
      { title: 'Sindhi folk poetry', author: 'Oral tradition', note: 'Traditional songs and ballads.' },
      { title: 'Modern Sindhi poetry', author: 'Shaikh Ayaz', note: 'Twentieth-century poetry.' },
      { title: 'Sindhi fiction', author: 'Modern Sindhi writers', note: 'Twentieth-century short stories and novels.' }
    ],
    criticism: 'Sufi interpretation, traditional rasa criticism, progressive and feminist approaches',
    sources: ['Sahitya Akademi histories of Sindhi literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Sindhi literary histories']
  },
  {
    slug: 'tamil', name: 'Tamil', family: 'Dravidian', script: 'Tamil script',
    region: 'Tamil Nadu', status: 'It is one of the original Eighth Schedule languages (1950) and was declared a classical language in 2004', scheduleShort: '1950',
    origin: 'Tamil is a Dravidian language with one of the oldest continuous literary traditions. The Sangam corpus and the Tolkappiyam are foundational.',
    periods: [
      { name: 'Sangam period', desc: 'Tolkappiyam, Ettuthogai and Pattupattu; Purananuru and Akananuru.' },
      { name: 'Epic period', desc: 'Silappathikaram, Manimekalai and the Tamil epics.' },
      { name: 'Bhakti period', desc: 'Nayanmars and Alvars; Tevaram and Nalayira Divya Prabandham.' },
      { name: 'Modern period', desc: 'Subramania Bharati, the novel, drama and contemporary writing.' }
    ],
    movements: ['Sangam literature', 'Bhakti movement', 'Tamil renaissance', 'Modernist movement'],
    authors: [
      { name: 'Thiruvalluvar', note: 'Author of the Thirukkural.' },
      { name: 'Ilango Adigal', note: 'Author of Silappathikaram.' },
      { name: 'Subramania Bharati', note: 'Modern poet and nationalist.' },
      { name: 'Kalki Krishnamurthy', note: 'Novelist; Ponniyin Selvan.' },
      { name: 'Jayakanthan', note: 'Modern fiction writer.' }
    ],
    works: [
      { title: 'Thirukkural', author: 'Thiruvalluvar', note: 'Couplets on ethics, polity and love.' },
      { title: 'Silappathikaram', author: 'Ilango Adigal', note: 'Tamil epic of Kovalan and Kannagi.' },
      { title: 'Ponniyin Selvan', author: 'Kalki Krishnamurthy', note: 'Historical novel.' },
      { title: 'Tamil modern poetry', author: 'Subramania Bharati', note: 'Nationalist and modern poetry.' }
    ],
    criticism: 'traditional rasa and alamkara criticism, Sangam poetics, nationalist and modern approaches',
    sources: ['Sahitya Akademi histories of Tamil literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Tamil literary histories']
  },
  {
    slug: 'telugu', name: 'Telugu', family: 'Dravidian', script: 'Telugu script',
    region: 'Andhra Pradesh and Telangana', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Telugu is a Dravidian language with an early literary tradition. Nannaya’s 11th-century Andhra Mahabharata is the first major work; the Kavitrayam and later poets shaped the language.',
    periods: [
      { name: 'Early period (11th–14th c.)', desc: 'Nannaya, Tikkana and Yerrapragada (Kavitrayam).' },
      { name: 'Medieval period (15th–18th c.)', desc: 'Srinatha, Potana, Annamacharya and Kshetrayya.' },
      { name: 'Nineteenth-century renaissance', desc: 'Gurajada Apparao and modern prose.' },
      { name: 'Modern period (20th c.–present)', desc: 'Modern poetry, fiction, drama and cinema.' }
    ],
    movements: ['Kavitrayam tradition', 'Bhakti movement', 'Telugu renaissance', 'Progressive movement'],
    authors: [
      { name: 'Nannaya', note: '11th-century poet; began the Andhra Mahabharata.' },
      { name: 'Gurajada Apparao', note: 'Modern writer; Kanyasulkam.' },
      { name: 'Viswanatha Satyanarayana', note: 'Poet and novelist; Jnanpith awardee.' },
      { name: 'Sri Sri', note: 'Modern poet; Maha Prasthanam.' },
      { name: 'C. Narayana Reddy', note: 'Poet and Jnanpith awardee.' }
    ],
    works: [
      { title: 'Andhra Mahabharata', author: 'Nannaya', note: 'First major Telugu literary work.' },
      { title: 'Kanyasulkam', author: 'Gurajada Apparao', note: 'Modern Telugu play of social reform.' },
      { title: 'Ramayana Kalpavriksham', author: 'Viswanatha Satyanarayana', note: 'Jnanpith-winning epic.' },
      { title: 'Maha Prasthanam', author: 'Sri Sri', note: 'Modernist poetry collection.' }
    ],
    criticism: 'traditional rasa and alamkara criticism, nationalist and Marxist criticism, modernist approaches',
    sources: ['Sahitya Akademi histories of Telugu literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Telugu literary histories']
  },
  {
    slug: 'urdu', name: 'Urdu', family: 'Indo-Aryan', script: 'Perso-Arabic script (Nastaliq)',
    region: 'pan-India', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Urdu developed from the Khari Boli dialect with Persian and Arabic influences in the Delhi Sultanate and Mughal periods. Amir Khusrau is an early figure; the ghazal became its signature form.',
    periods: [
      { name: 'Early period (13th–17th c.)', desc: 'Amir Khusrau, Wali Dakani and the Deccan schools.' },
      { name: 'Classical period (18th–19th c.)', desc: 'Mir Taqi Mir, Mirza Ghalib and the Delhi and Lucknow schools.' },
      { name: 'Modern period (19th–20th c.)', desc: 'Aligarh movement, Iqbal and the Progressive Writers’ Movement.' },
      { name: 'Contemporary period', desc: 'Partition literature, fiction and diaspora writing.' }
    ],
    movements: ['Deccani school', 'Delhi school', 'Lucknow school', 'Progressive Writers’ Movement'],
    authors: [
      { name: 'Mirza Ghalib', note: '19th-century poet; master of the ghazal.' },
      { name: 'Mir Taqi Mir', note: '18th-century poet; foundational Urdu ghazal poet.' },
      { name: 'Allama Iqbal', note: 'Poet and philosopher; Bang-e-Dra.' },
      { name: 'Faiz Ahmed Faiz', note: 'Progressive poet; Naqsh-e-Faryadi.' },
      { name: 'Ismat Chughtai', note: 'Fiction writer; Lifting the Veil.' }
    ],
    works: [
      { title: 'Diwan-e-Ghalib', author: 'Mirza Ghalib', note: 'Collection of Urdu ghazals.' },
      { title: 'Bang-e-Dra', author: 'Allama Iqbal', note: 'Poetic collection.' },
      { title: 'Naqsh-e-Faryadi', author: 'Faiz Ahmed Faiz', note: 'Progressive poetry collection.' },
      { title: 'Aag Ka Darya', author: 'Qurratulain Hyder', note: 'Novel of Indian history and identity.' }
    ],
    criticism: 'traditional rhetorics (ilm-e-bayan), progressive criticism, modernist and feminist approaches',
    sources: ['Sahitya Akademi histories of Urdu literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Urdu literary histories']
  },
  {
    slug: 'english-literature', name: 'English Literature', family: 'Germanic branch of the Indo-European family', script: 'Latin script',
    region: 'England and the English-speaking world', status: 'English is an associate official language of India; this optional is English Literature', scheduleShort: '1950',
    origin: 'English literature begins with Old English texts such as Beowulf and develops through Middle English (Chaucer), the Renaissance (Shakespeare, Milton), the Augustan age, Romanticism, the Victorian period and modernism.',
    periods: [
      { name: 'Old and Middle English (c. 7th–15th c.)', desc: 'Beowulf, Chaucer and medieval romance.' },
      { name: 'Renaissance and Restoration (16th–17th c.)', desc: 'Shakespeare, Milton and the metaphysical poets.' },
      { name: 'Augustan and Romantic (18th–19th c.)', desc: 'Dryden, Pope, Wordsworth, Coleridge, Keats and Shelley.' },
      { name: 'Victorian and Modern (19th–20th c.)', desc: 'Tennyson, Browning, Eliot, Woolf and Joyce.' }
    ],
    movements: ['Renaissance', 'Romanticism', 'Victorian realism', 'Modernism', 'Postcolonial literature'],
    authors: [
      { name: 'William Shakespeare', note: 'Playwright and poet; Hamlet, King Lear and Macbeth.' },
      { name: 'John Milton', note: 'Poet; Paradise Lost.' },
      { name: 'William Wordsworth', note: 'Romantic poet; Lyrical Ballads.' },
      { name: 'T.S. Eliot', note: 'Modernist poet and critic; The Waste Land.' },
      { name: 'Virginia Woolf', note: 'Modernist novelist; Mrs Dalloway.' }
    ],
    works: [
      { title: 'Hamlet', author: 'William Shakespeare', note: 'Tragedy of revenge and conscience.' },
      { title: 'Paradise Lost', author: 'John Milton', note: 'Epic poem of the Fall.' },
      { title: 'The Waste Land', author: 'T.S. Eliot', note: 'Modernist long poem.' },
      { title: 'Mrs Dalloway', author: 'Virginia Woolf', note: 'Modernist novel.' }
    ],
    criticism: 'Aristotle’s Poetics, Sidney, Dryden, Johnson, Wordsworth, Coleridge, Arnold, Eliot, Richards, Leavis and modern theory (Derrida, Foucault, Said, Spivak, Bhabha)',
    sources: ['The Norton Anthology of English Literature', 'David Daiches, A Critical History of English Literature', 'Andrew Sanders, The Short Oxford History of English Literature', 'University syllabi and prescribed texts'],
    mcqOverrides: [
      { text: 'English belongs to which language family?', correct: 'Germanic branch of Indo-European', distractors: ['Dravidian', 'Austroasiatic', 'Tibeto-Burman'], sol: 'English is a Germanic language of the Indo-European family.' },
      { text: 'Which script is used for English?', correct: 'Latin script', distractors: ['Devanagari', 'Perso-Arabic', 'Ol Chiki'], sol: 'English is written in the Latin script.' },
      { text: 'Which of the following is a major period of English literature?', correct: 'Romanticism', distractors: ['Sangam period', 'Charyapada period', 'Vedic period'], sol: 'Romanticism is a major period of English literature; the others belong to Indian literary traditions.' },
      null, null, null, null, null, null,
      { text: 'Which statement about English Literature as a UPSC optional is correct?', correct: 'It covers the history of English literature and literary criticism', distractors: ['It is an Eighth Schedule language paper', 'It only tests translation', 'It has no prescribed texts'], sol: 'The English Literature optional covers literary history, prescribed texts and criticism.' }
    ]
  }
];
