var fs = require('fs');

// Require the necessary discord.js classes
const { Client, GatewayIntentBits, IntentsBitField } = require('discord.js');
const { token } = require('./config.json');
const { joinVoiceChannel, createAudioResource, createAudioPlayer, VoiceConnectionStatus, AudioPlayerStatus, enterState } = require('@discordjs/voice')

const intents = new IntentsBitField();
intents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates);

// Create a new client instance
//const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const client = new Client({ intents: intents });
const player = createAudioPlayer();
let channel;
let connection;
let current_timer;
let file_properties = [];
let randomizedCategoryList = [];

// GLOBALS
const PATH_PREFIX = './audio/';
const FILE_LIST = 'chaos_bot_sounds - list.csv';


// Note - Values prefixed with '_' are selection options,
//        whereas ones without are "categories"

const PROBABILITIES = {
    '_standard': {
        'standard_meme': 70,
        'dkc':           10,
        'niche':         20,
        'dank_meme':     0,
    },
    '_vine_boom': {
        'vine_boom':     100
    },
    '_dkc': {
        'dkc':           100,
    },
    '_valorant': {
        'valorant':      100,
    },
    '_dank': {
        'dank_meme':     95,
        'standard_meme': 5,
    },
    '_vinny': {
        'vinny': 100,
    },
};

let sounds_by_category = {
    standard_meme: [],
    dank_meme: [],
    melee: [],
    niche: [],
    cursed: [],
    amongus: [],
    troll: [],
};

let sounds_by_subcategory = {
    dkc: [],
    valorant: [],
    melee: [],
    vinny: [],
    cursed: [],
    amongus: [],
    troll: [],
    filthy_frank: [],
    chess: [],
};

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'wreakhavoc') {
        let modeSelection = interaction.options.getString('mode') ?? '_standard';
        let frequencySelection = interaction.options.getString('frequency') ?? '_moderate';
        const replyMessage = '**Making some noise with these settings**:   `mode: ' + modeSelection + '`,   `frequency: ' + frequencySelection + '`'
		await interaction.reply(replyMessage).then(val => spamAudio(modeSelection, frequencySelection));
		//await interaction.reply('https://www.youtube.com/watch?v=LX-7AnOx22k').then(val => spamAudio());
	} else if (commandName === 'endhavoc') {
		await interaction.reply('ggwp').then(val => leave());
    }
});

// Login to Discord with your client's token
client.login(token);

// get file stuff read
fs.readFile(FILE_LIST, (err, data) => {
    if (err) throw err;
    let bufferString = data.toString();
    let arr = bufferString.split('\n');
    let existingFiles = arr.map(x => x.split(',')[0]);

    const COL_COUNT = arr[0].split(',').length;

    // write every row
    const all_files = fs.readdirSync(PATH_PREFIX);

    for (let i = 0; i < all_files.length; i++) {
        if (!existingFiles.includes(all_files[i])) {
            // APPEND
            let append_str = '\n' + all_files[i] + ','.repeat(COL_COUNT-1);

            fs.appendFileSync(FILE_LIST, append_str, (err) => {
                if (err) throw err;
                console.log(all_files[i] + ' added to list.');
            });
        }
    }

    fs.readFile(FILE_LIST, (err, data) => {
        if (err) throw err;
        let bufferString = data.toString();
        let arr = bufferString.split('\n');
        for (let i = 0; i < arr.length; i++) {
            arr[i] = arr[i].replace('\r', '');
            file_properties.push(arr[i].split(','));
        }
    });
});

function spamAudio(mode, frequency) {
    // start by clearing whatever is in the timer
    clearTimeout(current_timer);
    current_timer = 0;

    // TODO: replace hardcoded channel id
    channel = client.channels.cache.get('574047597258473483');
    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    connection.subscribe(player);

    // subscribe
    connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
        console.log('Connection is in the Ready state!');
    });

    player.once(AudioPlayerStatus.Playing, (oldState, newState) => {
        console.log('Audio player is in the Playing state!');
    });

    // load all files into these sounds_by_category
    for (let i = 1; i < file_properties.length; i++) {
        const filename = file_properties[i][0];
        const category = file_properties[i][1];
        const subcategory = file_properties[i][2];

        if (!category) continue;
        sounds_by_category[category].push(filename);
        if (!subcategory) continue;
        sounds_by_subcategory[subcategory].push(filename);
    }

    // manually add sounds to the single sound categories
    sounds_by_category['_vine_boom'] = ['vineboom.mp3'];
    sounds_by_category['_metal_pipe'] = ['metal-pipe-falling-(earrape).mp3'];

    // once files loaded, shuffle them all
    shuffleCategories();
    shuffleSubCategories();

    
    // sound list array
    randomizedCategoryList = [];

    switch(mode) {
        case '_vine_boom':
            randomizedCategoryList = ['vine_boom'];
            break;
        case '_metal_pipe':
            randomizedCategoryList = ['metal_pipe'];
            break;
        case '_vinny':
            randomizedCategoryList = ['vinny'];
            break;
        default: // use probabilities
            for (const [key, value] of Object.entries(PROBABILITIES[mode])) {
                console.log('add ', value, ' of ', key);
                for (let i = 0; i < value; i++) {
                    randomizedCategoryList.push(key);
                }
            }
    }
    shuffleArray(randomizedCategoryList);

    // fill up a queue of timers in seconds to play audio...
    let baseline_duration = 5.0; // in minutes
    switch (frequency) {
        case '_low':
            baseline_duration = 10.0;
            break;
        case '_moderate':
            baseline_duration = 5.0;
            break;
        case '_high':
            baseline_duration = 2.0;
            break;
        case '_spam':
            baseline_duration = 0.5;
            break;
    }
    const baseline_duration_seconds = baseline_duration * 60;
    const disruption_instances = 50;   // interval count
    const deviation = 0.4;             // % of baseline
    const soundQueueTimings = [];      // interval list

    for (let i = 0; i < disruption_instances; i++) {
        let secondsUntilSound = baseline_duration_seconds;
        secondsUntilSound += baseline_duration_seconds * getRandomArbitrary(-deviation, deviation);
        soundQueueTimings.push(secondsUntilSound);
    }

    playStartSound(mode);
    current_timer = setTimeout(playSoundAndQueueNext, soundQueueTimings[0] * 1000, 0, soundQueueTimings);
}

function leave() {
    clearTimeout(current_timer);
    current_timer = 0;
    player.stop();
    connection.disconnect();
    connection.destroy();
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function shuffleCategories() {
    for (const [key, value] of Object.entries(sounds_by_category)) {
        shuffleArray(value);
    }
}

function shuffleSubCategories() {
    for (const [key, value] of Object.entries(sounds_by_subcategory)) {
        shuffleArray(value);
    }
}

function playSoundAndQueueNext(index, soundQueueTimings) {
    //const resource = createAudioResource(PATH_PREFIX + 'bonk.mp3');
    const category_type = randomizedCategoryList[index % randomizedCategoryList.length];

    // check if we recognize subcategory
    if (category_type in sounds_by_subcategory) {
        const file = sounds_by_subcategory[category_type][0];
        const resource = createAudioResource(PATH_PREFIX + file);
        player.play(resource);
    }
    // no valid category, try subcategory
    else if(!sounds_by_category[category_type] || sounds_by_category[category_type].length == 0) {
        console.log('INVALID CATEGORY:', category_type);
    }
    else  {
        const file = sounds_by_category[category_type][0];
        const resource = createAudioResource(PATH_PREFIX + file);
        player.play(resource);
    }

    if(index >= soundQueueTimings.length) {
        index = 0;
    }

    shuffleCategories();
    shuffleSubCategories();

    console.log('play next sound in', soundQueueTimings[index % soundQueueTimings.length], 'seconds!');

    // set time until noise played
    current_timer = setTimeout(playSoundAndQueueNext, soundQueueTimings[index] * 1000, index+1, soundQueueTimings);
}

function playStartSound(mode) {
    let file = 'bonk.mp3';
    switch (mode) {
        case '_standard':
            break;
        case '_vine_boom':
            break;
        case '_metal_pipe':
            break;
        case '_dank':
            file = 'gunshot.mp3';
            break;
        case '_vinny':
            file = 'vinny_start.ogg';
            break;
        case '_dkc':
            file = 'Dixie Tagged.mp3';
            break;
    }

    const resource = createAudioResource(PATH_PREFIX + file);
    player.play(resource);
}