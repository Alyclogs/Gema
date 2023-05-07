const { Client, Message } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientID } = require('../../../config.json');
const rest = new REST({ version: "9" }).setToken(process.env.token);
const fs = require('fs')
const path = require('path');

module.exports = {
    name: 'reload',
    description: 'Reinicia un comando',
    aliases: [],
    owner: true,

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        if (message.author.id !== client.ownerIDS[0]) return;
        const { commands, slashCommands, commandsArray } = client

        if (args[0]?.toLowerCase() === 'msg') {
            if (!args[1]) {
                return message.reply({ content: `Debes especificar el comando a reiniciar`, allowedMentions: { repliedUser: false } })
            }
            try {
                reloadCommand(args[1].toLowerCase())
            } catch (e) {
                return message.reply({ content: `Ups :v\n${e}`, allowedMentions: { repliedUser: false } })
            }
        } else if (args[0]?.toLowerCase() === 'slash') {
            if (!args[1]) {
                return message.reply({ content: `Debes especificar el comando a reiniciar`, allowedMentions: { repliedUser: false } })
            }
            try {
                reloadSlashCommand(args[1].toLowerCase())
            } catch (e) {
                return message.reply({ content: `Ups :v\n${e}`, allowedMentions: { repliedUser: false } })
            }
        } else {
            try {
                await reloadCommands()
                if (args[0] === 'true') reloadSlashCommands(true)
                else reloadSlashCommands(false)
                return message.reply({ content: `${emojis.check} Comandos reiniciados`, allowedMentions: { repliedUser: false } })
            } catch (e) {
                return message.reply({ content: `Ups :v\n${e}`, allowedMentions: { repliedUser: false } })
            }
        }

        async function reloadCommands() {
            const commandFolders = fs.readdirSync(path.join(__dirname, '../../../commands/msgCommands'));
            commands.sweep(() => true)

            for (const commandFolder of commandFolders) {
                const commandFiles = fs
                    .readdirSync(path.join(__dirname, '../../../commands/msgCommands', commandFolder))
                    .filter(file => file.endsWith('.js'));

                for (const commandFile of commandFiles) {
                    delete require.cache[require.resolve(`../../../commands/msgCommands/${commandFolder}/${commandFile}`)]

                    const command = require(`../../../commands/msgCommands/${commandFolder}/${commandFile}`);
                    if (!command.name || !command.description) {
                        console.log(`[❌] ${commandFile} no configurado.`)
                    }
                    commands.set(command.name, command);
                }
            }
        }

        async function reloadSlashCommands(reset) {
            const commandFolders = fs.readdirSync(path.join(__dirname, '../../../commands/slashCommands'));
            slashCommands.sweep(() => true)
            commandsArray.length = 0

            for (const commandFolder of commandFolders) {
                const slashCommandFiles = fs
                    .readdirSync(path.join(__dirname, '../../../commands/slashCommands', commandFolder))
                    .filter(file => file.endsWith('.js'));

                for (const commandFile of slashCommandFiles) {
                    delete require.cache[require.resolve(`../../../commands/slashCommands/${commandFolder}/${commandFile}`)]

                    const command = require(`../../../commands/slashCommands/${commandFolder}/${commandFile}`);
                    if (!command.data.name || !command.data.description) {
                        console.log(`[❌] ${commandFile} no configurado.`)
                    }
                    slashCommands.set(command.data.name, command);
                    commandsArray.push(command.data.toJSON());
                }
            }

            if (reset) {
                try {
                    await rest.put(Routes.applicationCommands(clientID), {
                        body: client.commandsArray
                    })
                } catch (e) {
                    console.log(`[functions > handlers > handleCommands] | ${e}`)
                }
            }
        }

        async function reloadCommand(cmdName) {
            const commandFolders = fs.readdirSync(path.join(__dirname, '../../../commands/msgCommands'));

            if (!commands.get(cmdName)) {
                return message.reply('El comando no existe')
            }
            commands.delete(cmdName)

            for (const commandFolder of commandFolders) {
                const commandFiles = fs
                    .readdirSync(path.join(__dirname, '../../../commands/msgCommands', commandFolder))
                    .filter(file => file.endsWith('.js'));

                for (const commandFile of commandFiles) {
                    if (commandFile === `${cmdName}.js`) {
                        delete require.cache[require.resolve(`../../../commands/msgCommands/${commandFolder}/${commandFile}`)]
                        const command = require(`../../../commands/msgCommands/${commandFolder}/${commandFile}`);
                        commands.set(command.name, command)
                        break
                    }
                }
            }
            return message.reply({ content: `${emojis.check} Comando reiniciado`, allowedMentions: { repliedUser: false } })
        }

        async function reloadSlashCommand(cmdName) {
            const commandFolders = fs.readdirSync(path.join(__dirname, '../../../commands/slashCommands'));

            if (!slashCommands.get(cmdName)) {
                return message.reply('El comando no existe')
            }
            slashCommands.delete(cmdName)

            for (const commandFolder of commandFolders) {
                const slashCommandFiles = fs
                    .readdirSync(path.join(__dirname, '../../../commands/slashCommands', commandFolder))
                    .filter(file => file.endsWith('.js'));

                for (const commandFile of slashCommandFiles) {
                    if (commandFile === `${cmdName}.js`) {
                        delete require.cache[require.resolve(`../../../commands/slashCommands/${commandFolder}/${commandFile}`)]
                        const command = require(`../../../commands/slashCommands/${commandFolder}/${commandFile}`);
                        slashCommands.set(command.data.name, command);
                        break
                    }
                }
            }
            return message.reply({ content: `${emojis.check} Comando reiniciado`, allowedMentions: { repliedUser: false } })
        }
    }
}