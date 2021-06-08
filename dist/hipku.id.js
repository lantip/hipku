/*
 ** Hipku version 0.0.2
 ** Copyright (c) Gabriel Martin 2014
 ** All rights reserved
 ** Available under the MIT license
 ** http://gabrielmartin.net/projects/hipku
 */
/*
 ** Bahasa Indonesia Version by Rony Lantip 2014
 */
;
var Hipku = (function() {
    /*
     ** ############## 
     ** Public Methods
     ** ##############
     */

    /*
     ** Object holds all public methods and is returned by the module
     */
    var publicMethods = {};

    /*
     ** Public method to encode IP Addresses as haiku
     */
    var encode = function(ip) {
        var ipv6, decimalOctetArray, factoredOctetArray, encodedWordArray,
            haikuText;

        ipv6 = ipIsIpv6(ip);
        decimalOctetArray = splitIp(ip, ipv6);
        factoredOctetArray = factorOctets(decimalOctetArray, ipv6);
        encodedWordArray = encodeWords(factoredOctetArray, ipv6);
        haikuText = writeHaiku(encodedWordArray, ipv6);

        return haikuText;
    };

    /*
     ** Public method to decode haiku into IP Addresses
     */
    var decode = function(haiku) {
        var wordArray, ipv6, factorArray, octetArray, ipString;

        wordArray = splitHaiku(haiku);
        ipv6 = haikuIsIpv6(wordArray);
        factorArray = getFactors(wordArray, ipv6);
        octetArray = getOctets(factorArray, ipv6);
        ipString = getIpString(octetArray, ipv6);

        return ipString;
    };

    /*
     ** Attach the public methods to the return object
     */
    publicMethods.encode = encode;
    publicMethods.decode = decode;

    /*
     ** #############################  
     ** Helper functions for encoding
     ** #############################
     */

    function ipIsIpv6(ip) {
        if (ip.indexOf(':') != -1) { return true; } else if (ip.indexOf('.') != -1) { return false; } else {
            throw new Error('Formatting error in IP Address input.' +
                ' ' + 'Contains neither ":" or "."');
        }
    }

    function splitIp(ip, ipv6) {
        var octetArray, separator, v6Base, numOctets, decimalOctetArray;

        octetArray = [];
        decimalOctetArray = [];
        v6Base = 16;

        if (ipv6) {
            separator = ':';
            numOctets = 8;
        } else {
            separator = '.';
            numOctets = 4;
        }

        /*
         ** Remove newline and space characters
         */
        ip = ip.replace(/[\n\ ]/g, '');
        octetArray = ip.split(separator);

        /*
         ** If IPv6 address is in abbreviated format, we need to replace missing octets with 0
         */
        if (octetArray.length < numOctets) {
            if (ipv6) {
                var numMissingOctets = (numOctets - octetArray.length);

                octetArray = padOctets(octetArray, numMissingOctets);
            } else {
                throw new Error('Formatting error in IP Address input.' +
                    ' ' + 'IPv4 address has fewer than 4 octets.');
            }
        }

        /*
         ** Conter IPv6 addresses from hex to decimal
         */
        if (ipv6) {
            for (var i = 0; i < octetArray.length; i++) {
                decimalOctetArray[i] = parseInt(octetArray[i], v6Base);
            }
        } else {
            decimalOctetArray = octetArray;
        }

        return decimalOctetArray;
    }

    /*
     ** If IPv6 is abbreviated, pad with appropriate number of 0 octets
     */
    function padOctets(octetArray, numMissingOctets) {
        var paddedOctet, aLength;

        paddedOctet = 0;
        aLength = octetArray.length;

        /*
         ** If the first or last octets are blank, zero them
         */
        if (octetArray[0] === '') {
            octetArray[0] = paddedOctet;
        }
        if (octetArray[aLength - 1] === '') {
            octetArray[aLength - 1] = paddedOctet;
        }

        /*
         ** Check the rest of the array for blank octets and pad as needed
         */
        for (var i = 0; i < aLength; i++) {
            if (octetArray[i] === '') {
                octetArray[i] = paddedOctet;

                for (var j = 0; j < numMissingOctets; j++) {
                    octetArray.splice(i, 0, paddedOctet);
                }
            }
        }

        return octetArray;
    }

    /*
     ** Convert each decimal octet into a factor of the divisor (16 or 256)
     ** and a remainder
     */
    function factorOctets(octetArray, ipv6) {
        var divisor, factoredOctetArray;

        factoredOctetArray = [];

        if (ipv6) {
            divisor = 256;
        } else {
            divisor = 16;
        }

        for (var i = 0; i < octetArray.length; i++) {
            var octetValue, factor1, factor2;

            octetValue = octetArray[i];

            factor1 = octetArray[i] % divisor;
            octetValue = octetValue - factor1;
            factor2 = octetValue / divisor;

            factoredOctetArray.push(factor2);
            factoredOctetArray.push(factor1);
        }

        return factoredOctetArray;
    }

    function encodeWords(factorArray, ipv6) {
        var key, encodedWordArray;

        encodedWordArray = [];
        key = getKey(ipv6);

        for (var i = 0; i < factorArray.length; i++) {
            var dict;

            dict = key[i];
            encodedWordArray[i] = dict[factorArray[i]];
        }

        return encodedWordArray;
    }


    /*
     ** Return an array of dictionaries representing the correct word
     ** order for the haiku
     */

    /*
     ** I've change the order so it would fit with bahasa indonesia structure
     ** -- Rony Lantip
     */
    function getKey(ipv6) {
        var key;

        if (ipv6) {
            key = [adjectives,
                nouns,
                adjectives,
                nouns,
                verbs,
                adjectives,
                adjectives,
                adjectives,
                adjectives,
                adjectives,
                nouns,
                adjectives,
                nouns,
                verbs,
                adjectives,
                nouns
            ];
        } else {
            key = [animalAdjectives,
                animalColors,
                animalNouns,
                natureAdjectives,
                natureNouns,
                plantNouns,
                plantVerbs
            ];
        }

        return key;
    }

    function writeHaiku(wordArray, ipv6) {
        var octet, schemaResults, schema, nonWords, haiku;

        octet = 'OCTET'; // String to place in schema to show word slots
        schemaResults = getSchema(ipv6, octet);
        schema = schemaResults[0];
        nonWords = schemaResults[1];

        /*
         ** Replace each instance of 'octet' in the schema with a word from
         ** the encoded word array
         */
        for (var i = 0; i < wordArray.length; i++) {
            for (var j = 0; j < schema.length; j++) {
                if (schema[j] === octet) {
                    schema[j] = wordArray[i];
                    break;
                }
            }
        }

        /*
         ** Capitalize appropriate words
         */
        schema = capitalizeHaiku(schema, nonWords);
        haiku = schema.join('');

        return haiku;
    }

    /*
     ** I made a slight changes too in this function so the word will flows better
     ** -- Rony Lantip
     */

    function getSchema(ipv6, octet) {
        var schema, newLine, period, space, nonWords;

        schema = [];
        newLine = '\n';
        period = '.';
        space = ' ';
        nonWords = [newLine, period, space];

        if (ipv6) {
            schema = [octet,
                octet,
                'dan',
                octet,
                octet,
                newLine,
                octet,
                octet,
                'menutupi',
                octet,
                octet,
                'dan si',
                octet,
                octet,
                octet,
                period,
                newLine,
                octet,
                octet,
                octet,
                octet,
                octet,
                period,
                newLine
            ];
        } else {
            schema = ['Si',
                octet,
                octet,
                newLine,
                octet,
                'di',
                octet,
                octet,
                period,
                newLine,
                octet,
                octet,
                period,
                newLine
            ];
        }

        /*
         ** Add spaces before words except the first word
         */
        for (var i = 1; i < schema.length; i++) {
            var insertSpace = true;

            /*
             ** If the next entry is a nonWord, don't add a space
             */
            for (var j = 0; j < nonWords.length; j++) {
                if (schema[i] === nonWords[j]) {
                    insertSpace = false;
                }
            }

            /*
             ** If the previous entry is a newLine, don't add a space
             */
            if (schema[i - 1] === newLine) {
                insertSpace = false;
            }

            if (insertSpace) {
                schema.splice(i, 0, space);
                i = i + 1;
            }
        }

        return [schema, nonWords];
    }

    function capitalizeHaiku(haikuArray, nonWords) {
        var period = '.';

        /*
         ** Always capitalize the first word
         */
        haikuArray[0] = capitalizeWord(haikuArray[0]);

        for (var i = 1; i < haikuArray.length; i++) {

            if (haikuArray[i] === period) {
                var isWord;

                /*
                 ** If the current entry is a period then the next entry will be
                 ** a newLine or a space, so check two positions ahead and 
                 ** capitalize that entry, so long as it's a word
                 */

                isWord = true;

                if (haikuArray[i + 2] === undefined ||
                    haikuArray[i + 2] === null ||
                    haikuArray[i + 2] === '') {
                    isWord = false;
                }

                for (var j = 0; j < nonWords.length; j++) {
                    if (haikuArray[i + 2] === nonWords[j]) {
                        isWord = false;
                    }
                }

                if (isWord) {
                    haikuArray[i + 2] = capitalizeWord(haikuArray[i + 2]);
                }
            }
        }

        return haikuArray;
    }

    function capitalizeWord(word) {
        word = word.substring(0, 1).toUpperCase() +
            word.substring(1, word.length);

        return word;
    }

    /*
     ** #############################  
     ** Helper functions for decoding
     ** #############################
     */

    function splitHaiku(haiku) {
        var wordArray;

        haiku = haiku.toLowerCase();

        /*
         ** Replace newline characters with spaces 
         */
        haiku = haiku.replace(/\n/g, ' ');

        /*
         ** Remove anything that's not a letter, a space or a dash
         */
        haiku = haiku.replace(/[^a-z\ -]/g, '');
        wordArray = haiku.split(' ');

        /*
         ** Remove any blank entries
         */
        for (var i = 0; i < wordArray.length; i++) {
            if (wordArray[i] === '') {
                wordArray.splice(i, 1);
            }
        }

        return wordArray;
    }

    function haikuIsIpv6(wordArray) {
        var ipv6, key, dict;

        key = getKey(false);
        dict = key[0];
        ipv6 = true;

        /*
         ** Compare each word in the haiku against each word in the first
         ** dictionary defined in the IPv4 key. If there's a match, the 
         ** current haiku is IPv4. If not, IPv6.
         */
        for (var i = 0; i < wordArray.length; i++) {
            var currentWord = wordArray[i];

            for (var j = 0; j < dict.length; j++) {
                if (currentWord === dict[j]) {
                    ipv6 = false;
                    break;
                }
            }

            if (ipv6 === false) {
                break;
            }
        }

        return ipv6;
    }

    /* 
     ** Return an array of factors and remainders for each encoded
     ** octet-value
     */
    function getFactors(wordArray, ipv6) {
        var key, factorArray, wordArrayPosition;

        key = getKey(ipv6);
        factorArray = [];
        wordArrayPosition = 0;

        /*
         ** Get the first dictionary from the key. Check the first entry in
         ** the encoded word array to see if it's in that dictionary. If it 
         ** is, store the dictionary offset and move onto the next dictionary
         ** and the next word in the encoded words array. If there isn't a
         ** match, keep the same dictionary but check the next word in the
         ** array. Keep going till we have an offset for each dictionary in
         ** the key.
         */
        for (var i = 0; i < key.length; i++) {
            var result, factor, newPosition;

            result = [];
            result = getFactorFromWord(key[i], key.length,
                wordArray, wordArrayPosition);
            factor = result[0];
            newPosition = result[1];
            wordArrayPosition = newPosition;

            factorArray.push(factor);
        }

        return factorArray;
    }

    function getFactorFromWord(dict, maxLength, words, position) {
        var factor = null;

        for (var j = 0; j < dict.length; j++) {
            var dictEntryLength, wordToCheck;

            /*
             ** Get the number of words in the dictionary entry
             */
            dictEntryLength = dict[j].split(' ').length;

            /*
             ** build a string to compare against the dictionary entry
             ** by joining the appropriate number of wordArray entries
             */
            wordToCheck =
                words.slice(position, position + dictEntryLength);
            wordToCheck = wordToCheck.join(' ');

            if (dict[j] === wordToCheck) {
                factor = j;

                /*
                 ** If the dictionary entry word count is greater than one,
                 ** increment the position counter by the difference to
                 ** avoid rechecking words we've already checkced
                 */
                position = position + (dictEntryLength - 1);
                break;
            }
        }

        position = position + 1;

        if (factor === null) {
            if (position >= maxLength) {
                /*
                 ** We've reached the entry of the haiku and still not matched
                 ** all necessary dictionaries, so throw an error
                 */
                throw new Error('Decoding error: one or more dictionary words' +
                    'missing from input haiku');
            } else {
                /*
                 ** Couldn't find the current word in the current dictionary,
                 ** try the next word
                 */
                return getFactorFromWord(dict, maxLength, words, position);
            }
        } else {
            /*
             ** Found the word - return the dictionary offset and the new
             ** word array position
             */
            return [factor, position];
        }
    }

    function getOctets(factorArray, ipv6) {
        var octetArray, multiplier;

        octetArray = [];
        if (ipv6) {
            multiplier = 256;
        } else {
            multiplier = 16;
        }

        for (var i = 0; i < factorArray.length; i = i + 2) {
            var factor1, factor2, octet;

            factor1 = factorArray[i];
            factor2 = factorArray[i + 1];
            octet = (factor1 * multiplier) + factor2;

            if (ipv6) {
                octet = octet.toString(16);
            }

            octetArray.push(octet);
        }

        return octetArray;
    }

    function getIpString(octetArray, ipv6) {
        var ipString, separator;

        ipString = '';

        if (ipv6) {
            separator = ':';
        } else {
            separator = '.';
        }

        for (var i = 0; i < octetArray.length; i++) {
            if (i > 0) {
                ipString += separator;
            }
            ipString += octetArray[i];
        }

        return ipString;
    }

    /*
     ** ############ 
     ** Dictionaries
     ** ############
     */

    var adjectives, nouns, verbs, animalAdjectives, animalColors,
        animalNouns, animalVerbs, natureAdjectives, natureNouns,
        plantNouns, plantVerbs;

    /*
     ** IPv4 dictionaries
     */

    animalAdjectives = ['gemuk',
        'kenyang',
        'pintar',
        'lamban',
        'bodoh',
        'penakut',
        'penurut',
        'lapar',
        'kesepian',
        'liar',
        'bingung',
        'kasar',
        'pendiam',
        'pemikir',
        'gugup',
        'setia'
    ];

    animalColors = ['coklat',
        'hitam',
        'biru',
        'terang',
        'abu',
        'khaki',
        'gelap',
        'belang',
        'hijau',
        'emas',
        'lusuh',
        'perak',
        'pucat',
        'jambon',
        'merah',
        'putih'
    ];

    animalNouns = ['kera',
        'beruang',
        'gagak',
        'merpati',
        'katak',
        'kambing',
        'elang',
        'domba',
        'tikus',
        'ulat',
        'kutilang',
        'babi',
        'celeng',
        'ular',
        'kodok',
        'serigala'
    ];

    animalVerbs = ['duduk',
        'murung',
        'nangis',
        'nyelam',
        'makan',
        'gelut',
        'ngaum',
        'ngamuk',
        'lompat',
        'baring',
        'ngolet',
        'lari',
        'tidur',
        'girang',
        'bangun',
        'nguap'
    ];

    natureAdjectives = ['tua',
        'terlantar',
        'terindah',
        'ramai',
        'terpencil',
        'kosong',
        'berkabut',
        'segar',
        'dingin',
        'tinggi',
        'damai',
        'tenang',
        'berdebu',
        'keramat',
        'terang',
        'perawan'
    ];

    natureNouns = ['lembah',
        'padang',
        'ladang',
        'lereng',
        'hutan',
        'sahara',
        'hutan',
        'ngarai',
        'gunung',
        'sawah',
        'sungai',
        'bukit',
        'gumuk',
        'puncak',
        'jurang',
        'rawa'
    ];

    plantNouns = ['jati',
        'duwet',
        'nanas',
        'mangga',
        'palem',
        'nyiur',
        'anggrek',
        'puspa',
        'karet',
        'duku',
        'benih',
        'pakis',
        'putik',
        'talas',
        'rotan',
        'bambu'
    ];

    plantVerbs = ['tertiup',
        'meranggas',
        'menari',
        'menggesek',
        'meluruh',
        'bersemi',
        'berbuah',
        'bertumpuk',
        'merunduk',
        'bertumbang',
        'berkembang',
        'meliuk',
        'berpusing',
        'melayang',
        'berubah',
        'melintir'
    ];

    /*
     ** IPv6 dictionaries
     */

    adjectives = ['bongsor',
        'tepat',
        'lengkung',
        'debu',
        'jelek',
        'hanya',
        'krem',
        'besar',
        'hitam',
        'lunak',
        'suram',
        'pirang',
        'biru',
        'tumpul',
        'tersipu',
        'tebal',
        'tulang',
        'masing-masing',
        'ikatan',
        'nekad',
        'kuningan',
        'berani',
        'singkat',
        'cepat',
        'luas',
        'perunggu',
        'bersih',
        'terbakar',
        'tenang',
        'atap',
        'suci',
        'murah',
        'kedinginan',
        'resik',
        'kasar',
        'dingin',
        'keren',
        'jagung',
        'bergerigi',
        'gila',
        'krim',
        'garing',
        'mentah',
        'tiran',
        'terkutuk',
        'manis',
        'edan',
        'becek',
        'gelap',
        'mati',
        'tuli',
        'terkasih',
        'dalam',
        'padat',
        'redup',
        'menjemukan',
        'kering',
        'membosankan',
        'pingsan',
        'adil',
        'palsu',
        'salah',
        'terkenal',
        'jauh',
        'banter',
        'gemuk',
        'sengit',
        'apik',
        'pasti',
        'datar',
        'cacat',
        'menyukai',
        'busuk',
        'kalem',
        'gratis',
        'segar',
        'penuh',
        'gembira',
        'murung',
        'bagus',
        'kuburan',
        'abu-abu',
        'hebat',
        'hijau',
        'kelabu',
        'galau',
        'kereng',
        'sulit',
        'parau',
        'tinggi',
        'serak',
        'panas',
        'raksasa',
        'luka',
        'demam',
        'giok',
        'jet',
        'bala',
        'peka',
        'mulus',
        'lemah',
        'kejur',
        'lebar',
        'terakhir',
        'telat',
        'condong',
        'cabul',
        'terang',
        'lemas',
        'hidup',
        'segan',
        'sendirian',
        'panjang',
        'renggang',
        'tersesat',
        'jorok',
        'bising',
        'rendah',
        'subut',
        'marah',
        'lelaki',
        'bertopeng',
        'bengis',
        'penurut',
        'gemulai',
        'semriwing',
        'lembab',
        'diam',
        'terdekat',
        'rapi',
        'baru',
        'adi',
        'bugil',
        'kebas',
        'ganjil',
        'tua',
        'menderita',
        'pucat',
        'persik',
        'pir',
        'kesal',
        'jambon',
        'terusik',
        'polos',
        'prem',
        'montok',
        'mewah',
        'miskin',
        'macak',
        'berkelas',
        'formal',
        'prima',
        'segera',
        'cenderung',
        'bangga',
        'memangkas',
        'bata',
        'murni',
        'pelik',
        'kuarsa',
        'lekas',
        'jeda',
        'menebal',
        'asli',
        'merah',
        'kaya',
        'matang',
        'berbulir',
        'tambung',
        'buru-buru',
        'berkarat',
        'sedih',
        'aman',
        'bijak',
        'waras',
        'hangus',
        'berbentuk',
        'persis',
        'klimis',
        'pendek',
        'cerdas',
        'melengking',
        'menyusut',
        'malu',
        'lara',
        'ahli',
        'terbunuh',
        'licin',
        'tipis',
        'ramping',
        'lemot',
        'kecil',
        'pintar',
        'alus',
        'sombong',
        'tiruan',
        'nyaman',
        'lembut',
        'sember',
        'dicari',
        'masam',
        'cadangan',
        'jarang',
        'letik',
        'manja',
        'sigap',
        'jongkok',
        'serius',
        'basi',
        'berbinar',
        'kukuh',
        'curam',
        'kaku',
        'aneh',
        'remeh',
        'membentang',
        'ketat',
        'belang',
        'kokoh',
        'sopan',
        'yakin',
        'langsing',
        'bergaya',
        'juwita',
        'tangkas',
        'jangkung',
        'jinak',
        'gosong',
        'getir',
        'tegang',
        'sejuk',
        'cebol',
        'gendut',
        'kurus',
        'kerempeng',
        'cungkring',
        'lelah',
        'bergigi',
        'cabik',
        'tangguh',
        'rata',
        'terikat',
        'kembar',
        'bekas',
        'samar',
        'percuma',
        'lawa',
        'bertudung',
        'jengkel',
        'keji',
        'hangat',
        'lembek',
        'berselaput',
        'silap',
        'mencong',
        'muda'
    ];

    nouns = ['semut',
        'kera',
        'berbisa',
        'bandulan',
        'kait',
        'duri',
        'bas',
        'kalong',
        'manik-manik',
        'paruh',
        'beruang',
        'lebah',
        'lonceng',
        'sabuk',
        'burung',
        'taji',
        'gumpalan',
        'mekar',
        'celeng',
        'perahu',
        'baut',
        'buku',
        'mangkuk',
        'cowok',
        'kerapu',
        'jodoh',
        'renungan',
        'sapu',
        'biadab',
        'uang',
        'lampu',
        'kerbau',
        'buru-buru',
        'roti',
        'betis',
        'pedet',
        'kucing',
        'arang',
        'bahu',
        'kor',
        'remis',
        'warga',
        'awan',
        'badut',
        'tuna',
        'koin',
        'mobil',
        'kerucut',
        'kabel',
        'sapi',
        'kepiting',
        'bangau',
        'gagak',
        'kultus',
        'syah',
        'panah',
        'kencan',
        'kijang',
        'kirik',
        'dadu',
        'cakram',
        'adalah',
        'anjing',
        'pintu',
        'bius',
        'doves',
        'mimpi',
        'gemuruh',
        'bebek',
        'kotoran',
        'cebol',
        'belut',
        'telur',
        'rusa',
        'kidang',
        'larva',
        'peri',
        'domba',
        'mata',
        'wajah',
        'fakta',
        'menjilat',
        'kaki',
        'pakis',
        'iwak',
        'tinju',
        'nyala',
        'lalat',
        'geng',
        'seruling',
        'belo',
        'musuh',
        'bego',
        'unggas',
        'katak',
        'buah',
        'gerombolan',
        'embun',
        'angsa',
        'permata',
        'kuman',
        'hantu',
        'jembalang',
        'bandot',
        'anggur',
        'mempelai',
        'belibis',
        'belatung',
        'penjaga',
        'camar',
        'tangan',
        'kelinci',
        'elang',
        'kepala',
        'jantung',
        'babon',
        'jamu',
        'perbukitan',
        'khinzir',
        'lubang',
        'kawanan',
        'ide',
        'botol',
        'jalak',
        'anak-anak',
        'raja',
        'layangan',
        'pemuda',
        'danau',
        'biri-biri',
        'mop',
        'lingsa',
        'cahaya',
        'sayap',
        'tenun',
        'brengos',
        'turangga',
        'topeng',
        'pengerat',
        'pantomim',
        'cerpelai',
        'kabut',
        'tungau',
        'massa',
        'cetakan',
        'kumin',
        'bulan',
        'rengat',
        'kadal',
        'bidadari',
        'bola-api',
        'buto',
        'pungguk',
        'berlian',
        'pir',
        'polong',
        'bertengger',
        'babi',
        'lembing',
        'cemara',
        'datar',
        'pohon',
        'prem',
        'kolam',
        'udang',
        'pangkas',
        'pesek',
        'sumbu',
        'gemak',
        'puyuh',
        'ratu',
        'pena',
        'rakit',
        'hujan',
        'luncuran',
        'tikus',
        'sinar',
        'iga',
        'batu',
        'beteng',
        'jambang',
        'syair',
        'pasir',
        'segel',
        'lautan',
        'benih',
        'budak',
        'beling',
        'hiu',
        'embik',
        'kerang',
        'ketinting',
        'beting',
        'jalang',
        'ebi',
        'skat',
        'langit',
        'sigung',
        'kungkang',
        'keong',
        'mbelgedhes',
        'senyum',
        'bekicot',
        'ular',
        'berkik',
        'tunggal',
        'lagu',
        'sekop',
        'bocah',
        'kecambah',
        'gendut',
        'jongkok',
        'kubus',
        'cumi',
        'bintang',
        'bajing',
        'biji',
        'blekok',
        'liar',
        'matahari',
        'banyak',
        'kerumunan',
        'bengkak',
        'deras',
        'aspal',
        'regu',
        'gigi',
        'setali',
        'onak',
        'benang',
        'singgasana',
        'kutu',
        'bangkong',
        'alat',
        'pepohonan',
        'suku',
        'pancing',
        'forel',
        'nada',
        'taring',
        'vena',
        'kerja',
        'jalar',
        'piti',
        'kumbang',
        'ombak',
        'sumur',
        'paus',
        'jerawat',
        'bau',
        'angin',
        'serigala',
        'cacing',
        'roh',
        'emprit',
        'lelucon'
    ];

    verbs = ['menyumbang',
        'merengkuh',
        'mengajak',
        'memotong',
        'memohon',
        'memangsa',
        'menolak',
        'menghina',
        'melawan',
        'menyanyi',
        'menebak',
        'membidik',
        'menyalahkan',
        'memutihkan',
        'berdarah',
        'berdoa',
        'berbohong',
        'mengaburkan',
        'sombong',
        'mendukung',
        'menarik',
        'melompat',
        'meringkuk',
        'melahirkan',
        'menyeduh',
        'menyuap',
        'menerangkan',
        'mengasini',
        'merebus',
        'mencari',
        'menggosok',
        'membangun',
        'bakar',
        'meledak',
        'memanggil',
        'kalem',
        'lapar',
        'dongkol',
        'memuji',
        'menuntut',
        'berrencana',
        'menipu',
        'memeriksa',
        'menghibur',
        'kedinginan',
        'tersedak',
        'membacok',
        'memilih',
        'mengocok',
        'mengutip',
        'menangkup',
        'bertepuk',
        'menjepit',
        'mencakar',
        'membersihkan',
        'mencuci',
        'menjapit',
        'bersembunyi',
        'menggandakan',
        'cengkeram',
        'membujuk',
        'menyela',
        'mendamba',
        'panik',
        'menangis',
        'mengerkah',
        'mengobati',
        'mengutuk',
        'menuding',
        'menantang',
        'menatap',
        'merusak',
        'menggali',
        'memencet',
        'ragu',
        'meragukan',
        'menyeret',
        'meniris',
        'mengejar',
        'menggambar',
        'mengancam',
        'menghantam',
        'menekur',
        'minum',
        'tumpah',
        'menyetir',
        'jatuh',
        'tenggelam',
        'mengeringkan',
        'membuang',
        'makan',
        'menggaruk',
        'menghadapi',
        'gagal',
        'bersalah',
        'takut',
        'menyuapi',
        'merasa',
        'mengumpan',
        'kelahi',
        'cari',
        'perbaiki',
        'membalik',
        'mengusap',
        'terbang',
        'mengedip',
        'menopang',
        'mengapung',
        'menyelubung',
        'membagi',
        'bebas',
        'diam',
        'berisik',
        'menghasilkan',
        'berkedip',
        'mangap',
        'menguap',
        'berayun',
        'meraih',
        'mencengkeram',
        'merenggut',
        'bersedih',
        'menggenggam',
        'menyapu',
        'menjaga',
        'berjaga',
        'memandu',
        'menelan',
        'menyusut',
        'menahan',
        'tergores',
        'benci',
        'melebar',
        'menghantui',
        'memiliki',
        'menyembuhkan',
        'mendengar',
        'membantu',
        'menggembala',
        'mengejek',
        'memperkerjakan',
        'memukul',
        'menghindar',
        'mengitari',
        'memeluk',
        'merangkul',
        'bersijingkat',
        'mematuk',
        'mencibir',
        'bergabung',
        'lompat',
        'menyimpan',
        'menendang',
        'membunuh',
        'mencium',
        'mengikat',
        'membantai',
        'meninggalkan',
        'mengangkat',
        'menyukai',
        'mencintai',
        'memanggul',
        'menelusuri',
        'menyasar',
        'membuat',
        'menyelubungi',
        'bertemu',
        'meleleh',
        'membengkok',
        'merindukan',
        'merangkai',
        'berpindah',
        'tidur',
        'menamai',
        'membutuhkan',
        'mengerjakan',
        'melukis',
        'menghardik',
        'membayar',
        'melipat',
        'mengindik',
        'melecehkan',
        'mohon',
        'memasang',
        'membungkus',
        'menguji',
        'merayu',
        'mensinisi',
        'mencetak',
        'mencoba',
        'bekerja',
        'hadir',
        'menatah',
        'memelintir',
        'bergulat',
        'mencuplik',
        'menyerang',
        'naik',
        'beradu',
        'menunggang',
        'memanggang',
        'berkembang',
        'merajai',
        'mengukur',
        'memahat',
        'terluka',
        'berpencar',
        'berjuang',
        'menusuk',
        'menimbang',
        'melilit',
        'menggeser',
        'melihat',
        'mencabik',
        'membingkai',
        'mengirim',
        'merasakan',
        'melayani',
        'mengguncang',
        'memilin',
        'memilah',
        'menembak',
        'mengendus',
        'menampar',
        'mencincang',
        'mengiris',
        'membanting',
        'mematuhi',
        'membaui',
        'merangkak',
        'melotot',
        'menghajar',
        'mengendap',
        'berjongkok',
        'menyelami',
        'menyisakan',
        'memuncrat',
        'memecah',
        'menakuti',
        'memencar',
        'mengaduk',
        'mengelindan',
        'mencoblos',
        'menggores',
        'mencari',
        'mencuri',
        'mengemudi',
        'menyengat',
        'menendangi',
        'menyetrum',
        'melabeli',
        'mengibas',
        'memasak',
        'menggantung',
        'mengajari',
        'memayungi'
    ];

    module.exports = publicMethods;

})();