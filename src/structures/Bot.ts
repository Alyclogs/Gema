import { ApplicationCommandDataResolvable, Client, ClientEvents, Collection, ColorResolvable, GatewayIntentBits, ModalBuilder } from 'discord.js';
import { join } from 'path';
import fs from 'fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from '../config.json';
import { CommandType, SlashCommandType, RegisterCommandsOptions } from '../typing/Command';
import emojis from '../util/emojis.json'
import { Event } from '../typing/Event';
import { Autoresponder, GEmbed, GButton, GMessage, buttonModel, GSelectMenu } from '../models/gema-models'
import Functions from '../util/functions';

export default class Bot extends Client {
  public config = config
  public commands = new Collection<string, CommandType>()
  public slashCommands = new Collection<string, SlashCommandType>();
  public commandsArray: ApplicationCommandDataResolvable[] = [];
  public emotes = emojis
  public timeouts = new Collection<string, number>()
  public color: ColorResolvable = config.color as ColorResolvable
  public ownerIDS = config.ownerIDS
  public autoresponders: Autoresponder[] = []
  public embeds: GEmbed[] = []
  public nsfwgifs: string[] = []
  public buttons = new Collection<string, GButton>()
  public selectmenus: GSelectMenu[] = []
  public messages: GMessage[] = []
  public modals: ModalBuilder[] = []
  public functions: Functions

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
      ],
      allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
    })
    this.functions = new Functions(this)
  }

  public start() {
    this.login(process.env.token);

    this.on('warn', (info) => console.log(info));
    this.on('error', console.error);

    this.importEvents();
    this.importCommands();
    this.importSlashCommands();
    this.importComponents();
  }

  private async importEvents() {
    const eventFiles = fs
      .readdirSync(join(__dirname, '../events'))
      .filter((file) => !file.endsWith('.map'));

    for (const file of eventFiles) {
      const filePath = join(join(__dirname, '../events'), file);
      const event: Event<keyof ClientEvents> = (await import(filePath))?.default;

      if (event.data.once) {
        this.once(event.data.name, (...args) => {
          try {
            event.run(this, ...args)
          } catch (err) {
            this.functions.sendGemaError(err as Error)
          }
        });
      } else {
        this.on(event.data.name, (...args) => {
          try {
            event.run(this, ...args)
          } catch (err) {
            this.functions.sendGemaError(err as Error)
          }
        });
      }
    }
  }

  private async importCommands() {
    const commandFolders = fs
      .readdirSync(join(__dirname, '../commands/msgCommands'))

    for (const commandFolder of commandFolders) {
      const commandFiles = fs
        .readdirSync(join(__dirname, '../commands/msgCommands', commandFolder))
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = `../commands/msgCommands/${commandFolder}/${file}`;
        const command: CommandType = (await import(filePath)).default;

        this.commands.set(command.name, command);
      }
    }
    console.log(`[✅] Comandos cargados`);
  }

  private async importSlashCommands(register?: boolean | undefined, guildID?: string | undefined) {
    const commandFolders = fs
      .readdirSync(join(__dirname, '../commands/slashCommands'))

    for (const commandFolder of commandFolders) {
      const commandFiles = fs
        .readdirSync(join(__dirname, '../commands/slashCommands', commandFolder))
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = `../commands/slashCommands/${commandFolder}/${file}`;
        const command: SlashCommandType = (await import(filePath)).default;

        this.slashCommands.set(command.data.name, command);

        const commandData = command.data.toJSON();
        this.commandsArray.push(commandData);
      }
    }

    if (register) {
      this.registerCommands({
        commands: this.commandsArray,
        guildId: guildID || undefined
      })
    }
  }

  private async registerCommands({ commands, guildId }: RegisterCommandsOptions) {
    const rest = new REST({ version: '9' }).setToken(process.env.token);
    if (guildId) {
      console.log(guildId)
      rest
        .put(
          Routes.applicationGuildCommands(config.clientID, process.env.guildId),
          { body: commands }
        )
        .then(() =>
          console.log(`[✅] Comandos slash cargados`)
        )
        .catch(console.error);
    } else {
      rest
        .put(
          Routes.applicationCommands(config.clientID),
          { body: commands }
        )
        .then(() =>
          console.log(`[✅] Comandos slash cargados`)
        )
        .catch(console.error);
    }
  }

  private async importComponents() {
    const buttonFiles = fs
      .readdirSync(join(__dirname, '../components/buttons'))

    for (const file of buttonFiles) {
      const filePath = `../components/buttons/${file}`;
      const button: GButton = (await import(filePath))?.default;

      if (button) {
        this.buttons.set(button.customId, button);
      } else console.log(`El botón ${file} no está configurado`)
    }

    /*
    const selmFiles = fs
      .readdirSync(join(__dirname, '../components/selectmenus'))

    for (const file of selmFiles) {
      const filePath = `../components/selectmenus/${file}`;
      const selectmenu: GSelectMenu = (await import(filePath)).default;

      this.selectmenus.push(selectmenu)
    }
    */
  }

  public async syncButtons() {
    this.buttons.sweep(() => true)
    const buttons = await buttonModel.find({}).exec()
    for (let button of buttons) {
      this.buttons.set(button.customId, button)
    }
    await this.importComponents()
  }
}
