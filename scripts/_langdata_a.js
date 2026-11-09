// Language optional data — batch A (8 languages)
module.exports = [
  {
    slug: 'assamese', name: 'Assamese', family: 'Indo-Aryan', script: 'Assamese script (Bengali-derived)',
    region: 'Assam', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Assamese developed from Magadhi Prakrit through the Kamarupa Apabhramsha stage. The earliest Assamese prose appears in the 13th–14th century Buranjis (chronicles), and the Vaishnava movement of the 15th–16th century shaped the modern literary language.',
    periods: [
      { name: 'Early period (13th–15th c.)', desc: 'Buranjis, inscriptions and early devotional verse.' },
      { name: 'Vaishnava period (15th–17th c.)', desc: 'Sankaradeva and Madhavadeva created Kirtan Ghosha, Ankiya Nat and Borgeet.' },
      { name: 'Jonaki era (late 19th–early 20th c.)', desc: 'Romantic and nationalist writing around the journal Jonaki; Lakshminath Bezbaroa.' },
      { name: 'Modern period (20th c.–present)', desc: 'Realism, modernism and contemporary fiction and poetry.' }
    ],
    movements: ['Vaishnava movement', 'Jonaki era', 'Modernist movement'],
    authors: [
      { name: 'Sankaradeva', note: '15th–16th century Vaishnava saint, poet, playwright and reformer; pioneer of Assamese drama and devotional literature.' },
      { name: 'Hemchandra Barua', note: '19th century writer and lexicographer; compiled the Hemkosh dictionary and wrote early modern prose.' },
      { name: 'Lakshminath Bezbaroa', note: 'Leading Jonaki-era writer of essays, short stories and children’s literature.' },
      { name: 'Jyoti Prasad Agarwala', note: 'Poet, playwright and filmmaker; a nationalist and romantic voice.' },
      { name: 'Mamoni Raisom Goswami', note: 'Modern novelist and short-story writer; Jnanpith awardee.' }
    ],
    works: [
      { title: 'Kirtan Ghosha', author: 'Sankaradeva', note: 'Devotional verse biography of Krishna, central to Assamese Vaishnavism.' },
      { title: 'Hemkosh', author: 'Hemchandra Barua', note: 'Foundational Assamese dictionary.' },
      { title: 'Karengar Ligiri', author: 'Jyoti Prasad Agarwala', note: 'A landmark modern Assamese play.' },
      { title: 'Anya Jivan', author: 'Mamoni Raisom Goswami', note: 'A major modern novel of social and personal conflict.' }
    ],
    criticism: 'traditional rasa-based evaluation and modern Marxist, psychoanalytic and feminist readings',
    sources: ['Sahitya Akademi histories of Assamese literature', 'Encyclopaedia of Indian Literature (Sahitya Akademi)', 'University syllabi and prescribed texts', 'Standard Assamese literary histories']
  },
  {
    slug: 'bengali', name: 'Bengali', family: 'Indo-Aryan', script: 'Bengali script',
    region: 'West Bengal, Tripura and parts of Assam', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Bengali evolved from Magadhi Prakrit and the Apabhramsha of eastern India. The Charyapada (8th–12th century) are the earliest surviving specimens; the language acquired its modern form in the 19th century.',
    periods: [
      { name: 'Charyapada period (8th–12th c.)', desc: 'Mystic Buddhist songs, the earliest Bengali literature.' },
      { name: 'Medieval period (14th–18th c.)', desc: 'Mangalkavya, Vaishnava padavali, Sri Krishna Kirtan and translation literature.' },
      { name: 'Nineteenth-century renaissance', desc: 'Western contact, print, prose and the novel; Bankim Chandra and Rabindranath Tagore.' },
      { name: 'Modern period (20th c.–present)', desc: 'Modernism, post-modernism, partition literature and diaspora writing.' }
    ],
    movements: ['Charyapada', 'Vaishnava movement', 'Bengal Renaissance', 'Modernism'],
    authors: [
      { name: 'Rabindranath Tagore', note: 'Poet, novelist, playwright and Nobel laureate (1913); central figure of the Bengal Renaissance.' },
      { name: 'Bankim Chandra Chatterjee', note: 'Pioneer of the Bengali novel; wrote Durgeshnandini and Anandamath.' },
      { name: 'Sarat Chandra Chattopadhyay', note: 'Novelist of social realism; Devdas and Srikanta.' },
      { name: 'Kazi Nazrul Islam', note: 'Poet of rebellion; national poet of Bangladesh.' },
      { name: 'Mahasweta Devi', note: 'Socially engaged fiction writer and Jnanpith awardee.' }
    ],
    works: [
      { title: 'Gitanjali', author: 'Rabindranath Tagore', note: 'Poetry collection that won the Nobel Prize in Literature in 1913.' },
      { title: 'Anandamath', author: 'Bankim Chandra Chatterjee', note: 'Historical novel associated with the national movement.' },
      { title: 'Devdas', author: 'Sarat Chandra Chattopadhyay', note: 'Novel of love and social convention.' },
      { title: 'Pather Panchali', author: 'Bibhutibhushan Bandyopadhyay', note: 'Bildungsroman later adapted into Satyajit Ray’s film.' }
    ],
    criticism: 'traditional rasa theory, colonial-era literary history, Marxist criticism, psychoanalysis and feminist and postcolonial approaches',
    sources: ['Sahitya Akademi histories of Bengali literature', 'Encyclopaedia of Indian Literature', 'Tagore’s essays and letters', 'University syllabi and prescribed texts']
  },
  {
    slug: 'bodo', name: 'Bodo', family: 'Tibeto-Burman (Sino-Tibetan)', script: 'Devanagari script',
    region: 'Bodoland Territorial Region, Assam', status: 'It was added to the Eighth Schedule by the 92nd Constitutional Amendment Act, 2003', scheduleShort: '2003',
    origin: 'Bodo is a Tibeto-Burman language of the Bodo-Garo group. It has a rich oral tradition of folk songs, ballads and creation myths; modern written literature developed in the 20th century, and the language is now written mainly in Devanagari.',
    periods: [
      { name: 'Oral period', desc: 'Folk songs, ballads, riddles and creation myths transmitted orally.' },
      { name: 'Early written period (20th c.)', desc: 'Community publications, primers and early poetry.' },
      { name: 'Modern period (mid-20th c.–present)', desc: 'Poetry, drama, fiction and criticism, with Sahitya Akademi recognition.' }
    ],
    movements: ['Oral tradition', 'Modern Bodo literary movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Kalicharan Brahma', note: 'Social and religious reformer who promoted Bodo education and writing.' },
      { name: 'Rupnath Brahma', note: 'Early Bodo public figure and writer associated with community uplift.' },
      { name: 'Bodo Sahitya Sabha', note: 'Literary institution that standardised and promoted modern Bodo writing.' }
    ],
    works: [
      { title: 'Bodo folk ballads', author: 'Oral tradition', note: 'Traditional narrative songs, including love and heroic ballads.' },
      { title: 'Bodo primers and early prose', author: 'Early Bodo writers', note: 'Primers and community publications that standardised the written language.' },
      { title: 'Modern Bodo poetry', author: 'Modern Bodo poets', note: 'Post-independence poetry collections in Devanagari.' },
      { title: 'Bodo drama and fiction', author: 'Modern Bodo writers', note: 'Twentieth-century drama and fiction on community and social themes.' }
    ],
    criticism: 'oral-formulaic study of folk literature, socio-historical criticism and modern stylistic analysis',
    sources: ['Sahitya Akademi Bodo literature resources', 'Encyclopaedia of Indian Literature', 'Bodo Sahitya Sabha publications', 'University syllabi and prescribed texts'],
    mcqOverrides: [
      null, null, null,
      { text: 'Which of the following is a major form of Bodo literature?', correct: 'Folk ballads and oral epics', distractors: ['Sanskrit court epic', 'Persian ghazal', 'Bengali Mangalkavya'], sol: 'Bodo literature has a strong oral tradition of folk ballads and oral epics.' },
      null, null,
      { text: 'Kalicharan Brahma is associated with:', correct: 'Bodo social and religious reform', distractors: ['Bengali novel writing', 'Sanskrit grammar', 'Tamil Sangam poetry'], sol: 'Kalicharan Brahma was a Bodo social and religious reformer who promoted education and writing.' },
      null, null, null, null, null, null, null, null
    ],
    sample: {
      passage: 'बर\' भाषा आसामनि मुंखिमुंखि रावनि। बर\' भाषा देवनागरी लिपिजों लिरनाय जायो। बर\' लोकनि बाथौ धर्मनि गोनां।',
      english: 'Bodo is a language spoken in Assam. Bodo is written in the Devanagari script. The Bodo people follow the Bathou religion.'
    }
  },
  {
    slug: 'dogri', name: 'Dogri', family: 'Indo-Aryan', script: 'Devanagari script (also Perso-Arabic in Pakistan)',
    region: 'Jammu region of Jammu and Kashmir', status: 'It was added to the Eighth Schedule by the 92nd Constitutional Amendment Act, 2003', scheduleShort: '2003',
    origin: 'Dogri is an Indo-Aryan language of the Jammu region. It has a rich oral tradition of folk songs and tales; modern written literature developed in the 20th century and is written mainly in Devanagari in India.',
    periods: [
      { name: 'Oral period', desc: 'Folk songs, ballads and folk tales transmitted orally.' },
      { name: 'Early written period (18th–19th c.)', desc: 'Early devotional and courtly writing.' },
      { name: 'Modern period (20th c.–present)', desc: 'Poetry, fiction, drama and criticism; Sahitya Akademi recognition.' }
    ],
    movements: ['Oral tradition', 'Modern Dogri movement', 'Sahitya Akademi phase'],
    authors: [
      { name: 'Shiv Nath Shastri', note: 'Pioneering modern Dogri writer, often described as the father of modern Dogri literature.' },
      { name: 'Padma Sachdev', note: 'Major Dogri poet and prose writer; Sahitya Akademi awardee.' },
      { name: 'Master Zia', note: 'Popular Dogri poet known for simple, emotionally resonant verse.' }
    ],
    works: [
      { title: 'Mithi Deewar', author: 'Padma Sachdev', note: 'Autobiographical prose work that won the Sahitya Akademi Award.' },
      { title: 'Pita Putra', author: 'Shiv Nath Shastri', note: 'A landmark modern Dogri literary work.' },
      { title: 'Dogri folk songs', author: 'Oral tradition', note: 'Traditional songs of love, marriage and seasonal festivals.' },
      { title: 'Modern Dogri poetry', author: 'Modern Dogri poets', note: 'Twentieth-century poetry on social and personal themes.' }
    ],
    criticism: 'traditional folk-aesthetic study, socio-cultural criticism and modern stylistic analysis',
    sources: ['Sahitya Akademi Dogri literature resources', 'Encyclopaedia of Indian Literature', 'Jammu University syllabi and prescribed texts', 'Dogri Sanstha publications'],
    sample: {
      passage: 'डोगरी जम्मू कश्मीर दे जम्मू क्षेत्र दी प्रमुख भाषा ऐ। एह् भाषा देवनागरी लिपि च लिखी जंदी ऐ। डोगरी साहित्य च लोकगीतां ते लोककथांवां दा बड़ा महत्व ऐ।',
      english: 'Dogri is the main language of the Jammu region of Jammu and Kashmir. It is written in the Devanagari script. Folk songs and folk tales have great importance in Dogri literature.'
    }
  },
  {
    slug: 'gujarati', name: 'Gujarati', family: 'Indo-Aryan', script: 'Gujarati script',
    region: 'Gujarat', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Gujarati developed from Gurjara Apabhramsha and Old Western Rajasthani. The earliest works date from the 12th century; the modern literary language took shape in the 19th century with print and reform movements.',
    periods: [
      { name: 'Early and Bhakti period (12th–17th c.)', desc: 'Devotional poetry of Narsinh Mehta, Akho and Premanand.' },
      { name: 'Nineteenth-century reform period', desc: 'Narmad, Govardhanram Tripathi and the social-reform essay and novel.' },
      { name: 'Gandhian and nationalist period', desc: 'Political prose, autobiography and nationalist poetry.' },
      { name: 'Modern period (20th c.–present)', desc: 'Modernism, experimental fiction and diaspora writing.' }
    ],
    movements: ['Bhakti movement', 'Nineteenth-century reform movement', 'Gandhian movement', 'Modernism'],
    authors: [
      { name: 'Narmadashankar Dave (Narmad)', note: 'Nineteenth-century reformer and writer; pioneer of modern Gujarati prose and poetry.' },
      { name: 'Govardhanram Tripathi', note: 'Author of the four-volume novel Saraswatichandra.' },
      { name: 'Mahatma Gandhi', note: 'Wrote extensively in Gujarati; his autobiography is a landmark of Gujarati prose.' },
      { name: 'Umashankar Joshi', note: 'Poet, critic and Jnanpith awardee.' },
      { name: 'Pannalal Patel', note: 'Novelist of rural Gujarat; Jnanpith awardee.' }
    ],
    works: [
      { title: 'Saraswatichandra', author: 'Govardhanram Tripathi', note: 'Four-volume novel of social reform and national awakening.' },
      { title: 'Mari Jeevan Katha (autobiography)', author: 'Mahatma Gandhi', note: 'Landmark of Gujarati autobiographical prose.' },
      { title: 'Manvi ni Bhavai', author: 'Pannalal Patel', note: 'Jnanpith-winning novel of rural life.' },
      { title: 'Nishkant', author: 'Umashankar Joshi', note: 'Major modern Gujarati poetic work.' }
    ],
    criticism: 'traditional rasa criticism, reformist and Gandhian criticism, Marxist and modernist approaches',
    sources: ['Sahitya Akademi histories of Gujarati literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Gujarati literary histories']
  },
  {
    slug: 'hindi', name: 'Hindi', family: 'Indo-Aryan', script: 'Devanagari script',
    region: 'the Hindi belt of north and central India', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Hindi developed from Shauraseni Apabhramsha and the Khariboli dialect. Its literary history is conventionally divided into Adikal, Bhaktikal, Ritikal and Adhunik kal.',
    periods: [
      { name: 'Adikal (early period, c. 11th–14th c.)', desc: 'Chand Bardai, Amir Khusrau and early heroic and devotional verse.' },
      { name: 'Bhaktikal (devotional period, c. 14th–17th c.)', desc: 'Kabir, Surdas, Tulsidas and Mirabai.' },
      { name: 'Ritikal (courtly period, c. 17th–19th c.)', desc: 'Keshavdas, Bihari and Ghananand; ornate poetry of love and courtly life.' },
      { name: 'Adhunik kal (modern period, 19th c.–present)', desc: 'Bharatendu Harishchandra, Premchand, Chhayavad, progressivism and contemporary writing.' }
    ],
    movements: ['Bhakti movement', 'Riti tradition', 'Chhayavad', 'Progressive writers’ movement', 'Nayi Kahani'],
    authors: [
      { name: 'Tulsidas', note: '16th-century poet; author of the Ramcharitmanas.' },
      { name: 'Kabir', note: '15th-century mystic poet; nirguna bhakti and social critique.' },
      { name: 'Premchand', note: 'Pioneer of the modern Hindi novel and short story; Godaan and Gaban.' },
      { name: 'Mahadevi Varma', note: 'Chhayavad poet and essayist.' },
      { name: 'Ramdhari Singh Dinkar', note: 'Poet of heroic and nationalist verse; Rashmirathi.' }
    ],
    works: [
      { title: 'Ramcharitmanas', author: 'Tulsidas', note: 'Retelling of the Ramayana in Awadhi, central to devotional literature.' },
      { title: 'Godaan', author: 'Premchand', note: 'Novel of rural poverty and exploitation.' },
      { title: 'Kamayani', author: 'Jaishankar Prasad', note: 'Chhayavad epic of human aspiration and suffering.' },
      { title: 'Madhushala', author: 'Harivansh Rai Bachchan', note: 'Poetic work using the metaphor of wine and the tavern.' }
    ],
    criticism: 'traditional rasa and dhvani criticism, nationalist criticism, Marxist and progressive criticism, feminist and Dalit approaches',
    sources: ['Sahitya Akademi histories of Hindi literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Hindi literary histories (e.g., Ramchandra Shukla)']
  },
  {
    slug: 'kannada', name: 'Kannada', family: 'Dravidian', script: 'Kannada script',
    region: 'Karnataka', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Kannada is a Dravidian language with a literary history going back over a millennium. The Kavirajamarga (9th century) is the earliest surviving work of Kannada poetics; the language has a continuous literary tradition.',
    periods: [
      { name: 'Old Kannada (9th–12th c.)', desc: 'Kavirajamarga and the Ratnatraya — Pampa, Ranna and Ponna.' },
      { name: 'Vachana period (12th c.)', desc: 'Basavanna, Allama Prabhu and Akka Mahadevi; devotional vachana poetry.' },
      { name: 'Medieval period (14th–18th c.)', desc: 'Kumaravyasa, Ratnakaravarni and courtly epic poetry.' },
      { name: 'Modern period (19th c.–present)', desc: 'Modern poetry, the novel, drama and Navodaya and modernist movements.' }
    ],
    movements: ['Vachana movement', 'Navodaya', 'Modernist (Navya) movement', 'Dalit and Bandaya movements'],
    authors: [
      { name: 'Pampa', note: '10th-century poet; Adipurana and Vikramarjuna Vijaya.' },
      { name: 'Basavanna', note: '12th-century social reformer and vachana poet.' },
      { name: 'Kuvempu', note: 'Poet and novelist; Jnanpith awardee; Sri Ramayana Darshanam.' },
      { name: 'D.R. Bendre', note: 'Modern Kannada poet; Jnanpith awardee.' },
      { name: 'U.R. Ananthamurthy', note: 'Novelist and critic; Samskara.' }
    ],
    works: [
      { title: 'Vikramarjuna Vijaya', author: 'Pampa', note: 'Classic Kannada retelling of the Mahabharata.' },
      { title: 'Sri Ramayana Darshanam', author: 'Kuvempu', note: 'Jnanpith-winning modern epic.' },
      { title: 'Samskara', author: 'U.R. Ananthamurthy', note: 'Novel of caste, tradition and modernity.' },
      { title: 'Tughlaq', author: 'Girish Karnad', note: 'Landmark modern Kannada play.' }
    ],
    criticism: 'traditional alamkara criticism, Navodaya humanism, modernist and postcolonial criticism, Dalit and Bandaya critique',
    sources: ['Sahitya Akademi histories of Kannada literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Kannada literary histories']
  },
  {
    slug: 'kashmiri', name: 'Kashmiri', family: 'Indo-Aryan (Dardic group)', script: 'Perso-Arabic script (Sharada historically)',
    region: 'Kashmir Valley, Jammu and Kashmir', status: 'It is one of the original Eighth Schedule languages (1950)', scheduleShort: '1950',
    origin: 'Kashmiri is a Dardic language of the Indo-Aryan family. Its literary tradition begins with the 14th-century mystic Lal Ded; Persian and Sufi influences shaped the medieval and modern periods.',
    periods: [
      { name: 'Mystic period (14th–16th c.)', desc: 'Lal Ded’s vakhs and Nund Rishi’s shruks.' },
      { name: 'Medieval and Sufi period (16th–18th c.)', desc: 'Habba Khatoon, Mahmud Gami and Rasul Mir.' },
      { name: 'Modern period (19th–20th c.)', desc: 'Mahjoor, Zinda Kaul and Dina Nath Nadim; modern poetry and prose.' },
      { name: 'Contemporary period', desc: 'Diaspora writing, conflict literature and new media.' }
    ],
    movements: ['Shaiva mystic movement', 'Rishi order', 'Sufi poetry', 'Modern Kashmiri movement'],
    authors: [
      { name: 'Lal Ded (Lalleshwari)', note: '14th-century Shaiva mystic poet; her vakhs are foundational to Kashmiri literature.' },
      { name: 'Nund Rishi', note: '14th–15th century Sufi saint and poet; the Rishi order.' },
      { name: 'Habba Khatoon', note: '16th-century poet known for love lyrics.' },
      { name: 'Ghulam Ahmad Mahjoor', note: 'Pioneer of modern Kashmiri poetry.' },
      { name: 'Dina Nath Nadim', note: 'Modern poet and lyricist.' }
    ],
    works: [
      { title: 'Lalla Vakyani', author: 'Lal Ded (Lalleshwari)', note: 'Mystic verses (vakhs) attributed to Lal Ded.' },
      { title: 'Shruks', author: 'Nund Rishi', note: 'Devotional verses of the Rishi order.' },
      { title: 'Habba Khatoon’s lyrics', author: 'Habba Khatoon', note: 'Love lyrics of separation and longing.' },
      { title: 'Modern Kashmiri poetry', author: 'Ghulam Ahmad Mahjoor', note: 'Mahjoor pioneered modern Kashmiri poetry.' }
    ],
    criticism: 'mystic and Sufi interpretation, traditional rasa criticism, modern stylistic and postcolonial approaches',
    sources: ['Sahitya Akademi histories of Kashmiri literature', 'Encyclopaedia of Indian Literature', 'University syllabi and prescribed texts', 'Standard Kashmiri literary histories'],
    sample: {
      passage: 'کٲشُر چھِ جموں و کشمیرس مَنٛز بولنہٕ یوان۔ کٲشُر زبان چھِ فارسی عربی رسم الخطس مَنٛز لیکھنہٕ یوان۔ کٲشُر ادب چھُ پرانہ تہٕ واریاہ اہم۔',
      english: 'Kashmiri is spoken in Jammu and Kashmir. The Kashmiri language is written in the Perso-Arabic script. Kashmiri literature is old and very important.'
    }
  }
];
