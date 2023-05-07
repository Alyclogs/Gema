const { Client, GatewayIntentBits, Collection } = require('discord.js');
const keepAlive = require('./server');
const emojis = require('./utility/data/emojis.json');
const { color, ownerIDS } = require('./config.json')
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent,
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
})

const fs = require('fs');
const path = require('path');

client.commands = new Collection();
client.slashCommands = new Collection();
client.commandsArray = [];
client.autoresponders = [];
client.embeds = [];
client.timeouts = new Collection();
client.nsfwgifs = [];
client.emotes = emojis;
client.color = color;
client.ownerIDS = ownerIDS;

const functionFiles = fs
  .readdirSync(path.join(__dirname, './handlers'))
  .filter(file => file.endsWith('.js'));
for (const functionFile of functionFiles) {
  require(`./handlers/${functionFile}`)(client)
}

client.handleEvents();
client.loadCommands();
client.loadSlashCommands();

process.on('unhandledRejection', async (err) => {
  console.log(err)
})

keepAlive();

client.login(process.env.token);