import { ApplicationCommandDataResolvable, Client, ClientEvents, Collection, ColorResolvable, GatewayIntentBits, ModalBuilder } from 'discord.js';
import { basename, extname, join } from 'path';
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
  private messageCommandPaths = new Map<string, string>()
  private slashCommandPaths = new Map<string, string>()
  private eventPaths = new Map<string, string>()

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
    this.importComponents();
    this.importSlashCommands();
  }

  private async importEvents() {
    const eventFiles = fs
      .readdirSync(join(__dirname, '../events'))
      .filter((file) => !file.endsWith('.map'));

    for (const file of eventFiles) {
      const filePath = join(join(__dirname, '../events'), file);
      const event: Event<keyof ClientEvents> = (await import(filePath))?.default;

      if (event?.data?.name) {
        const eventName = event.data.name
        this.eventPaths.set(eventName, filePath)
        this.eventPaths.set(eventName.toLowerCase(), filePath)

        const fileBase = basename(file, extname(file)).toLowerCase()
        if (fileBase !== eventName.toLowerCase()) {
          this.eventPaths.set(fileBase, filePath)
        }
      }

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
        this.messageCommandPaths.set(command.name, filePath);

        if (command.aliases?.length) {
          for (const alias of command.aliases) {
            this.messageCommandPaths.set(alias, filePath);
          }
        }
      }
    }
    console.log(`[✅] Comandos cargados`);
  }

  private async importSlashCommands(register?: boolean | undefined, guildID?: string | undefined) {
    const commandFolders = fs
      .readdirSync(join(__dirname, '../commands/slashCommands'))

    this.commandsArray = [];
    this.slashCommands.clear();
    this.slashCommandPaths.clear();

    for (const commandFolder of commandFolders) {
      const commandFiles = fs
        .readdirSync(join(__dirname, '../commands/slashCommands', commandFolder))
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = `../commands/slashCommands/${commandFolder}/${file}`;
        const command: SlashCommandType = (await import(filePath)).default;

        this.slashCommands.set(command.data.name, command);
        this.slashCommandPaths.set(command.data.name, filePath);

        const commandData = command.data.toJSON();
        this.commandsArray.push(commandData);
      }
    }

    if (register) {
      await this.registerCommands({
        commands: this.commandsArray,
        guildId: guildID || undefined
      })
    }
  }

  private async registerCommands({ commands, guildId }: RegisterCommandsOptions) {
    const rest = new REST({ version: '9' }).setToken(process.env.token);
    const targetGuildId = guildId || undefined;

    if (targetGuildId) {
      console.log(`[📝] Registrando comandos slash en el servidor: ${targetGuildId}`)
      rest
        .put(
          Routes.applicationGuildCommands(config.clientID, targetGuildId),
          { body: commands }
        )
        .then(() =>
          console.log(`[✅] Comandos slash cargados para el servidor ${targetGuildId}`)
        )
        .catch(console.error);
    } else {
      rest
        .put(
          Routes.applicationCommands(config.clientID),
          { body: commands }
        )
        .then(() =>
          console.log(`[✅] Comandos slash globales cargados`)
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

    try {
      const buttons = await buttonModel.find({}).exec()
      for (let button of buttons) {
        const hydratedButton = Object.assign(new GButton(), button.toObject())
        this.buttons.set(hydratedButton.customId, hydratedButton)
      }
    } catch (error) {
      console.error('[⚠️] No se pudieron sincronizar los botones desde MongoDB:', error)
    }

    await this.importComponents()
  }

  public async reloadCommand(target: string, kind: 'message' | 'slash' | 'auto' = 'auto') {
    const normalizedTarget = target.toLowerCase()

    const candidatePaths: string[] = []

    if (kind === 'message' || kind === 'auto') {
      const messagePath = this.messageCommandPaths.get(normalizedTarget)
      if (messagePath) candidatePaths.push(messagePath)
    }

    if (kind === 'slash' || kind === 'auto') {
      const slashPath = this.slashCommandPaths.get(normalizedTarget)
      if (slashPath) candidatePaths.push(slashPath)
    }

    if (!candidatePaths.length) {
      throw new Error(`No se encontró el comando o alias: ${target}`)
    }

    const reloaded: string[] = []

    for (const filePath of candidatePaths) {
      const resolvedPath = require.resolve(filePath)
      delete require.cache[resolvedPath]

      if (filePath.includes('/slashCommands/')) {
        const reloadedCommand = (await import(filePath)).default as SlashCommandType
        this.slashCommands.set(reloadedCommand.data.name, reloadedCommand)
        this.slashCommandPaths.set(reloadedCommand.data.name, filePath)
        reloaded.push(`slash:${reloadedCommand.data.name}`)
      } else {
        const reloadedCommand = (await import(filePath)).default as CommandType
        this.commands.set(reloadedCommand.name, reloadedCommand)
        this.messageCommandPaths.set(reloadedCommand.name, filePath)
        if (reloadedCommand.aliases?.length) {
          for (const alias of reloadedCommand.aliases) {
            this.messageCommandPaths.set(alias, filePath)
          }
        }
        reloaded.push(`message:${reloadedCommand.name}`)
      }
    }

    return reloaded
  }

  public async ensureEventsLoaded() {
    if (this.eventPaths.size === 0) {
      await this.importEvents()
    }
  }

  public async reloadEvent(target: string) {
    await this.ensureEventsLoaded()

    const normalizedTarget = target.toLowerCase().replace(/^event:/i, '').trim()
    const eventPath = this.eventPaths.get(normalizedTarget)

    if (!eventPath) {
      throw new Error(`No se encontró el evento: ${target}`)
    }

    this.removeAllListeners(normalizedTarget)
    const resolvedPath = require.resolve(eventPath)
    delete require.cache[resolvedPath]

    const eventModule = (await import(eventPath)).default as Event<keyof ClientEvents>
    this.eventPaths.set(eventModule.data.name, eventPath)

    if (eventModule.data.once) {
      this.once(eventModule.data.name, (...args) => {
        try {
          eventModule.run(this, ...args)
        } catch (err) {
          this.functions.sendGemaError(err as Error)
        }
      })
    } else {
      this.on(eventModule.data.name, (...args) => {
        try {
          eventModule.run(this, ...args)
        } catch (err) {
          this.functions.sendGemaError(err as Error)
        }
      })
    }

    return eventModule.data.name
  }
}
