// Language optional data — batch B (8 languages)
module.exports = [
  {
    slug: 'konkani', name: 'Konkani', family: 'Indo-Aryan', script: 'Devanagari script (also Kannada script)',
    region: 'Goa and the Konkan coast', status: 'It was added to the Eighth Schedule by the 71st Constitutional Amendment Act, 1992', scheduleShort: '1992',
    origin: 'Konkani developed from Maharashtri Prakrit and Sauraseni Apabhramsha along the Konkan coast. It has a long oral and devotional tradition, and modern literary activity accelerated in the 19th–20th centuries.',
    periods: [
      { name: 'Early period (16th–18th c.)', desc: 'Devotional and missionary literature with Marathi and Portuguese influence.' },
      { name: 'Nineteenth–early twentieth century', desc: 'Print, journalism and the Konkani revival.' },
      { name: 'Modern period (mid-20th c.–present)', desc: 'Poetry, fiction, drama and Sahitya Akademi recognition.' }
    ],
    movements: ['Konkani revival movement', 'Modern Konkani movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Shenoi Goembab', note: 'Writer and activist; pioneer of the modern Konkani revival.' },
      { name: 'Bakibab Borkar', note: 'Major Konkani poet.' },
      { name: 'Ravindra Kelekar', note: 'Writer and Jnanpith awardee; champion of Konkani.' },
      { name: 'Damodar Mauzo', note: 'Novelist and short-story writer; Jnanpith awardee.' }
    ],
    works: [
      { title: 'Konkani folk songs', author: 'Oral tradition', note: 'Traditional songs of Goa and the Konkan coast.' },
      { title: 'Modern Konkani poetry', author: 'Bakibab Borkar', note: 'Twentieth-century Konkani poetry.' },
      { title: 'Himalayant', author: 'Ravindra Kelekar', note: 'A major Konkani work by Ravindra Kelekar.' },
      { title: 'Karmelin', author: 'Damodar Mauzo', note: 'Sahitya Akademi-winning novel.' }
    ],
    criticism: 'traditional devotional criticism, regionalist criticism and modern stylistic analysis',
    sources: ['Sahitya Akademi histories of Konkani literature', 'Encyclopaedia of Indian Literature', 'Goa University syllabi and prescribed texts', 'Standard Konkani literary histories']
  },
  {
    slug: 'maithili', name: 'Maithili', family: 'Indo-Aryan (Bihari group)', script: 'Devanagari script',
    region: 'the Mithila region of Bihar and Nepal', status: 'It was added to the Eighth Schedule by the 92nd Constitutional Amendment Act, 2003', scheduleShort: '2003',
    origin: 'Maithili is an Indo-Aryan language of the Bihari group, with a literary tradition going back to Vidyapati in the 14th–15th century. It is written in Devanagari.',
    periods: [
      { name: 'Early period (14th–16th c.)', desc: 'Vidyapati’s padavali and devotional poetry.' },
      { name: 'Medieval period (17th–19th c.)', desc: 'Courtly and devotional writing; Maithili drama and song.' },
      { name: 'Modern period (20th c.–present)', desc: 'Prose, fiction, drama and literary criticism.' }
    ],
    movements: ['Vidyapati tradition', 'Modern Maithili movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Vidyapati', note: '14th–15th century poet; his padavali shaped Maithili and neighbouring literatures.' },
      { name: 'Jyotirishwar Thakur', note: 'Fourteenth-century author of Varnaratnakara, an early Maithili prose work.' },
      { name: 'Harimohan Jha', note: 'Modern Maithili writer and essayist.' }
    ],
    works: [
      { title: 'Padavali', author: 'Vidyapati', note: 'Devotional songs of Radha and Krishna.' },
      { title: 'Varnaratnakara', author: 'Jyotirishwar Thakur', note: 'Early Maithili prose work on poetics and social life.' },
      { title: 'Maithili folk songs', author: 'Oral tradition', note: 'Traditional songs of Mithila.' },
      { title: 'Modern Maithili fiction', author: 'Modern Maithili writers', note: 'Twentieth-century prose fiction.' }
    ],
    criticism: 'traditional rasa and dhvani criticism, historical criticism and modern stylistic approaches',
    sources: ['Sahitya Akademi histories of Maithili literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Maithili literary histories']
  },
  {
    slug: 'malayalam', name: 'Malayalam', family: 'Dravidian', script: 'Malayalam script',
    region: 'Kerala', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Malayalam is a Dravidian language that separated from Tamil around the 9th–13th centuries. The Ramacharitam is an early work; the modern literary language developed under Bhakti and colonial influences.',
    periods: [
      { name: 'Early period (12th–15th c.)', desc: 'Ramacharitam and early Manipravalam literature.' },
      { name: 'Bhakti period (16th–17th c.)', desc: 'Ezhuthachan’s Adhyatma Ramayanam and Kunchan Nambiar’s Thullal.' },
      { name: 'Nineteenth-century renaissance', desc: 'Modern prose, journalism and the novel.' },
      { name: 'Modern period (20th c.–present)', desc: 'Romanticism, realism, modernism and contemporary writing.' }
    ],
    movements: ['Bhakti movement', 'Malayalam renaissance', 'Romantic movement', 'Modernist movement'],
    authors: [
      { name: 'Ezhuthachan', note: '16th-century Bhakti poet; Adhyatma Ramayanam.' },
      { name: 'Kumaran Asan', note: 'Modern poet of social and philosophical themes.' },
      { name: 'Vallathol Narayana Menon', note: 'Modern poet of nationalist and classical themes.' },
      { name: 'Thakazhi Sivasankara Pillai', note: 'Novelist; Chemmeen.' },
      { name: 'M.T. Vasudevan Nair', note: 'Novelist and screenwriter; Randamoozham.' }
    ],
    works: [
      { title: 'Adhyatma Ramayanam', author: 'Ezhuthachan', note: 'Bhakti retelling of the Ramayana.' },
      { title: 'Chemmeen', author: 'Thakazhi Sivasankara Pillai', note: 'Novel of fishing-community life.' },
      { title: 'Randamoozham', author: 'M.T. Vasudevan Nair', note: 'Retelling of the Mahabharata from Bhima’s perspective.' },
      { title: 'Khasakkinte Ithihasam', author: 'O.V. Vijayan', note: 'Modernist novel.' }
    ],
    criticism: 'traditional rasa criticism, romantic and nationalist criticism, modernist and postcolonial approaches',
    sources: ['Sahitya Akademi histories of Malayalam literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Malayalam literary histories']
  },
  {
    slug: 'manipuri', name: 'Manipuri (Meiteilon)', family: 'Tibeto-Burman (Sino-Tibetan)', script: 'Meitei Mayek (modern); Bengali script historically',
    region: 'Manipur', status: 'It was added to the Eighth Schedule by the 71st Constitutional Amendment Act, 1992', scheduleShort: '1992',
    origin: 'Manipuri (Meiteilon) is a Tibeto-Burman language. It has ancient Puya manuscripts written in Meitei Mayek and a strong oral tradition of ballads; modern literature developed in the 20th century.',
    periods: [
      { name: 'Early period', desc: 'Puya manuscripts and oral ballads such as Khamba-Thoibi.' },
      { name: 'Nineteenth–early twentieth century', desc: 'Early prose and drama under Bengali script influence.' },
      { name: 'Modern period (mid-20th c.–present)', desc: 'Poetry, fiction, drama and criticism, with Sahitya Akademi recognition.' }
    ],
    movements: ['Puya tradition', 'Modern Manipuri movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Hijam Anganghal Singh', note: 'Poet and novelist; Khamba-Thoibi Sheireng.' },
      { name: 'Khwairakpam Chaoba Singh', note: 'Early modern poet and writer.' },
      { name: 'M.K. Binodini Devi', note: 'Novelist and playwright; Boro Sahib Ongbi Sanatombi.' },
      { name: 'R.K. Jhalajit Singh', note: 'Historian and writer.' }
    ],
    works: [
      { title: 'Khamba-Thoibi Sheireng', author: 'Hijam Anganghal Singh', note: 'Epic poem based on the Khamba-Thoibi legend.' },
      { title: 'Boro Sahib Ongbi Sanatombi', author: 'M.K. Binodini Devi', note: 'Historical novel.' },
      { title: 'Manipuri folk ballads', author: 'Oral tradition', note: 'Traditional narrative songs.' },
      { title: 'Modern Manipuri poetry', author: 'Modern Manipuri poets', note: 'Twentieth-century poetry.' }
    ],
    criticism: 'traditional folk and rasa criticism, modern stylistic and historical approaches',
    sources: ['Sahitya Akademi histories of Manipuri literature', 'Encyclopaedia of Indian Literature', 'Manipur University syllabi and prescribed texts', 'Standard Manipuri literary histories']
  },
  {
    slug: 'marathi', name: 'Marathi', family: 'Indo-Aryan', script: 'Devanagari script',
    region: 'Maharashtra', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Marathi developed from Maharashtri Prakrit. The earliest literary work is Mukundraj’s Vivekasindhu (13th century); the Bhakti movement of Eknath, Tukaram and Ramdas shaped the modern literary language.',
    periods: [
      { name: 'Early period (13th–16th c.)', desc: 'Mukundraj, Eknath and the Warkari Bhakti poets.' },
      { name: 'Bhakti and courtly period (17th–18th c.)', desc: 'Tukaram, Ramdas, Moropant and Peshwa-era writing.' },
      { name: 'Nineteenth-century renaissance', desc: 'Print, journalism, the novel and social reform.' },
      { name: 'Modern period (20th c.–present)', desc: 'Modernism, Dalit literature, drama and contemporary fiction.' }
    ],
    movements: ['Warkari Bhakti movement', 'Nineteenth-century renaissance', 'Modernist movement', 'Dalit literary movement'],
    authors: [
      { name: 'Eknath', note: '16th-century Bhakti poet; Bhavartha Ramayana.' },
      { name: 'Tukaram', note: '17th-century Bhakti poet; abhangas.' },
      { name: 'V.S. Khandekar', note: 'Novelist and Jnanpith awardee; Yayati.' },
      { name: 'Vijay Tendulkar', note: 'Playwright; Ghashiram Kotwal.' },
      { name: 'Bhalchandra Nemade', note: 'Novelist and critic; Kosala; Jnanpith awardee.' }
    ],
    works: [
      { title: 'Bhavartha Ramayana', author: 'Eknath', note: 'Marathi retelling of the Ramayana.' },
      { title: 'Yayati', author: 'V.S. Khandekar', note: 'Jnanpith-winning novel.' },
      { title: 'Ghashiram Kotwal', author: 'Vijay Tendulkar', note: 'Political satire in drama.' },
      { title: 'Kosala', author: 'Bhalchandra Nemade', note: 'Modernist novel.' }
    ],
    criticism: 'traditional rasa criticism, nationalist and Marxist criticism, modernist, Dalit and feminist approaches',
    sources: ['Sahitya Akademi histories of Marathi literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Marathi literary histories']
  },
  {
    slug: 'nepali', name: 'Nepali', family: 'Indo-Aryan (Pahari group)', script: 'Devanagari script',
    region: 'Sikkim, Darjeeling and parts of Assam', status: 'It was added to the Eighth Schedule by the 71st Constitutional Amendment Act, 1992', scheduleShort: '1992',
    origin: 'Nepali is an Indo-Aryan language of the Pahari group. Bhanubhakta Acharya’s Ramayana translation is a foundational text; modern literature developed in the 19th–20th centuries.',
    periods: [
      { name: 'Early period (18th–19th c.)', desc: 'Bhanubhakta Acharya and the beginnings of modern Nepali literature.' },
      { name: 'Early twentieth century', desc: 'Laxmi Prasad Devkota, Balkrishna Sama and drama.' },
      { name: 'Modern period (mid-20th c.–present)', desc: 'Poetry, fiction and diaspora writing.' }
    ],
    movements: ['Bhanubhakta tradition', 'Modern Nepali movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Bhanubhakta Acharya', note: 'Poet; Adikavi; Bhanubhakta Ramayana.' },
      { name: 'Laxmi Prasad Devkota', note: 'Poet and playwright; Muna Madan.' },
      { name: 'Balkrishna Sama', note: 'Playwright and poet.' },
      { name: 'Parijat', note: 'Novelist; Sirish Ko Phool.' }
    ],
    works: [
      { title: 'Bhanubhakta Ramayana', author: 'Bhanubhakta Acharya', note: 'Foundational Nepali retelling of the Ramayana.' },
      { title: 'Muna Madan', author: 'Laxmi Prasad Devkota', note: 'Narrative poem of love and migration.' },
      { title: 'Sirish Ko Phool', author: 'Parijat', note: 'Modern Nepali novel.' },
      { title: 'Modern Nepali poetry', author: 'Modern Nepali poets', note: 'Twentieth-century poetry.' }
    ],
    criticism: 'traditional rasa criticism, romantic and nationalist criticism, modernist and diaspora approaches',
    sources: ['Sahitya Akademi histories of Nepali literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Nepali literary histories']
  },
  {
    slug: 'odia', name: 'Odia', family: 'Indo-Aryan', script: 'Odia script',
    region: 'Odisha', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Odia developed from Magadhi Prakrit and the Apabhramsha of eastern India. Sarala Das’s 15th-century Mahabharata marks the beginning of a distinct Odia literary tradition.',
    periods: [
      { name: 'Early period (15th–16th c.)', desc: 'Sarala Das and the Panchasakha poets.' },
      { name: 'Medieval period (17th–18th c.)', desc: 'Upendra Bhanja and ornate courtly poetry.' },
      { name: 'Nineteenth-century renaissance', desc: 'Radhanath Ray, Fakir Mohan Senapati and modern prose.' },
      { name: 'Modern period (20th c.–present)', desc: 'Realism, modernism and contemporary writing.' }
    ],
    movements: ['Panchasakha movement', 'Odia renaissance', 'Modernist movement'],
    authors: [
      { name: 'Sarala Das', note: '15th-century poet; Odia Mahabharata.' },
      { name: 'Fakir Mohan Senapati', note: 'Pioneer of modern Odia prose; Chha Mana Atha Guntha.' },
      { name: 'Radhanath Ray', note: 'Modern Odia poet.' },
      { name: 'Gopinath Mohanty', note: 'Novelist and Jnanpith awardee.' },
      { name: 'Sitakant Mahapatra', note: 'Poet and critic; Jnanpith awardee.' }
    ],
    works: [
      { title: 'Odia Mahabharata', author: 'Sarala Das', note: 'Early Odia retelling of the epic.' },
      { title: 'Chha Mana Atha Guntha', author: 'Fakir Mohan Senapati', note: 'Early Odia novel of rural exploitation.' },
      { title: 'Mati Matala', author: 'Gopinath Mohanty', note: 'Jnanpith-winning novel.' },
      { title: 'Odia poetry', author: 'Sitakant Mahapatra', note: 'Modern poetry of myth and memory.' }
    ],
    criticism: 'traditional rasa and dhvani criticism, nationalist and Marxist criticism, modernist approaches',
    sources: ['Sahitya Akademi histories of Odia literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Odia literary histories']
  },
  {
    slug: 'punjabi', name: 'Punjabi', family: 'Indo-Aryan', script: 'Gurmukhi script',
    region: 'Punjab', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Punjabi is an Indo-Aryan language written in Gurmukhi. Its literary tradition includes the Sikh scriptures, Sufi poetry and modern secular literature.',
    periods: [
      { name: 'Early period (15th–17th c.)', desc: 'Guru Nanak and the Sikh Gurus; Guru Granth Sahib.' },
      { name: 'Medieval period (18th–19th c.)', desc: 'Sufi poetry of Waris Shah and Bulleh Shah.' },
      { name: 'Modern period (19th–20th c.)', desc: 'Bhai Vir Singh, the Punjabi renaissance and nationalist writing.' },
      { name: 'Contemporary period', desc: 'Partition literature, diaspora writing and modern poetry.' }
    ],
    movements: ['Sikh literary tradition', 'Sufi poetry', 'Punjabi renaissance', 'Progressive movement'],
    authors: [
      { name: 'Guru Nanak', note: 'Founder of Sikhism; his hymns are part of the Guru Granth Sahib.' },
      { name: 'Waris Shah', note: '18th-century Sufi poet; Heer Ranjha.' },
      { name: 'Bhai Vir Singh', note: 'Modern Punjabi novelist and poet.' },
      { name: 'Amrita Pritam', note: 'Poet and novelist; Jnanpith awardee.' },
      { name: 'Shiv Kumar Batalvi', note: 'Modern poet; Luna.' }
    ],
    works: [
      { title: 'Guru Granth Sahib', author: 'Sikh Gurus', note: 'Sacred scripture containing hymns of the Sikh Gurus and saints.' },
      { title: 'Heer Ranjha', author: 'Waris Shah', note: 'Sufi narrative poem of love.' },
      { title: 'Luna', author: 'Shiv Kumar Batalvi', note: 'Modern Punjabi verse play.' },
      { title: 'Pinjar', author: 'Amrita Pritam', note: 'Novel of partition and displacement.' }
    ],
    criticism: 'traditional rasa criticism, Sikh and Sufi interpretation, nationalist, Marxist and feminist approaches',
    sources: ['Sahitya Akademi histories of Punjabi literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Punjabi literary histories']
  }
];
