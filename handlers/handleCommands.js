const { REST } = require('@discordjs/rest');
const { Client } = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { clientID } = require('../config.json');
const { Perms, Permissions2 } = require('../utility/validation/Permissions')
const rest = new REST({ version: "9" }).setToken(process.env.token);
const fs = require('fs');
const path = require('path');

/**
   * @param {Client} client
   */
module.exports = (client) => {
  client.loadSlashCommands = async () => {
    const commandFolders = fs.readdirSync(path.join(__dirname, '../commands/slashCommands'));
    const { slashCommands, commandsArray } = client;

    for (const commandFolder of commandFolders) {
      const slashCommandFiles = fs
        .readdirSync(path.join(__dirname, '../commands/slashCommands', commandFolder))
        .filter(file => file.endsWith('.js'));

      for (const commandFile of slashCommandFiles) {
        const command = require(`../commands/slashCommands/${commandFolder}/${commandFile}`);
        if (!command.data.name || !command.data.description) {
          return console.log(`[❌] ${commandFile} no configurado.`)
        }
        slashCommands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
      }
    }
    /*
    try {
      await rest.put(Routes.applicationCommands(clientID), {
        body: client.commandsArray
      })
    } catch (e) {
      console.log(`[functions > handlers > handleCommands] | ${e}`)
    }
    */
  }
  client.loadCommands = async () => {
    const commandFolders = fs.readdirSync(path.join(__dirname, '../commands/msgCommands'));
    const { commands } = client;

    for (const commandFolder of commandFolders) {
      const commandFiles = fs
        .readdirSync(path.join(__dirname, '../commands/msgCommands', commandFolder))
        .filter(file => file.endsWith('.js'));

      for (const commandFile of commandFiles) {
        const command = require(`../commands/msgCommands/${commandFolder}/${commandFile}`);
        if (!command.name || !command.description) {
          return console.log(`[❌] ${commandFile} no configurado.`)
        }
        commands.set(command.name, command);
      }
    }
  }
  console.log(`[✅] comandos cargados.`)
}