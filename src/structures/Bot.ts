import { ApplicationCommandDataResolvable, Client, ClientEvents, Collection, ColorResolvable, GatewayIntentBits } from 'discord.js';
import { basename, extname, join } from 'path';
import fs from 'fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from '../config.json';
import { CommandType, SlashCommandType, RegisterCommandsOptions } from '../typing/Command';
import emojis from '../lib/emojis.json'
import { Event } from '../typing/Event';
import { Autoresponder, GEmbed, GButton, GMessage, buttonModel, embedModel, selectmenuModel, messageModel, autoresponderModel, GSelectMenu, GModal } from '../models/gema-models'
import Functions from '../util/functions';
import { DefaultExtractors } from '@discord-player/extractor';
import { GuildQueue, GuildQueueEvent, Player } from 'discord-player';
import { Log as YoutubeLog, YoutubeiExtractor } from 'discord-player-youtubei';

export default class Bot extends Client {
  public config = config
  public commands = new Collection<string, CommandType>()
  public slashCommands = new Collection<string, SlashCommandType>();
  public commandsArray: ApplicationCommandDataResolvable[] = [];
  public emotes = emojis
  /** Cooldowns de comandos mensaje/slash y autoresponders: clave (nombre de comando o `ar:<trigger>`) -> (usuario -> timestamp de última ejecución en ms). */
  public cooldowns = new Collection<string, Collection<string, number>>()
  public color: ColorResolvable = config.color as ColorResolvable
  public ownerIDS = config.ownerIDS
  public autoresponders: Autoresponder[] = []
  public embeds: GEmbed[] = []
  public nsfwgifs: string[] = []
  public buttons = new Collection<string, GButton>()
  /** Botones registrados en caliente por un comando (ver `registerButton`). No se persisten ni se ven afectados por `syncButtons`. */
  public transientButtons = new Collection<string, GButton>()
  public selectmenus: GSelectMenu[] = []
  /** Selectmenus globales del bot cargados desde `components/selectmenus` (ver `resolveSelectMenu`). No confundir con `selectmenus`, que son los guardados por servidor en Mongo. */
  public globalSelectMenus = new Collection<string, GSelectMenu>()
  /** Selectmenus registrados en caliente por un comando (ver `registerSelectMenu`). */
  public transientSelectMenus = new Collection<string, GSelectMenu>()
  public messages: GMessage[] = []
  /** Modales globales del bot cargados desde `components/modals` (ver `resolveModal`). */
  public modals = new Collection<string, GModal>()
  /** Modales registrados en caliente por un comando (ver `registerModal`). */
  public transientModals = new Collection<string, GModal>()
  public functions: Functions
  public player: Player
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
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
      ],
      allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
    })
    this.functions = new Functions(this)
    this.player = new Player(this)
  }

  public async start() {
    await this.setupMusic()

    this.on('warn', (info) => console.log(info));
    this.on('error', console.error);

    await Promise.all([
      this.importEvents(),
      this.importCommands(),
      this.importComponents(),
      this.importSlashCommands(
        process.env.registerCommands !== 'false',
        process.env.environment === 'prod' ? undefined : process.env.guildId
      )
    ])

    await this.login(process.env.token);
  }

  private async setupMusic() {
    YoutubeLog.setLevel(YoutubeLog.Level.ERROR)
    await this.player.extractors.loadMulti(DefaultExtractors)
    await this.player.extractors.register(YoutubeiExtractor, {
      disablePlayer: true,
      streamOptions: { useClient: 'ANDROID' },
      useYoutubeDL: true,
      logLevel: 'ALL'
    })

    this.player.on('debug', (message) => {
      if (!/(error|failed|unable)/i.test(message)) return
      void this.functions.sendGemaError(new Error(message), {
        origen: 'debug del reproductor de música'
      })
    })

    this.player.on('error', (error) => {
      void this.functions.sendGemaError(error, { origen: 'reproductor de música' })
    })

    this.player.events.on(GuildQueueEvent.Error, (queue, error) => {
      void this.functions.sendGemaError(error, {
        origen: 'cola de música',
        servidor: queue.guild.id,
        canal_voz: queue.channel?.id
      })
    })

    this.player.events.on(GuildQueueEvent.PlayerStart, (queue, track) => {
      console.log(
        `[Música] PlayerStart guild=${queue.guild.id} track=${track.id} voice=${queue.connection?.state.status || 'sin conexión'}`
      )
      this.bumpEncoderBitrate(queue)
      const suppressAnnouncement = queue.metadata?.suppressNextStart === true
      queue.setMetadata({
        ...queue.metadata,
        suppressNextStart: false,
        lastStartedTrackId: track.id
      })
      if (suppressAnnouncement) {
        return
      }
      const channel = queue.metadata?.channel
      if (channel && 'send' in channel) {
        channel.send(`${this.emotes.star} Reproduciendo ahora **${track.cleanTitle}** — ${track.author}`).catch(console.error)
      }
    })

    this.player.events.on(GuildQueueEvent.PlayerError, (queue, error, track) => {
      console.error(`[Música] Error reproduciendo ${track.title}:`, error)
      void this.functions.sendGemaError(error, {
        origen: 'stream de música',
        servidor: queue.guild.id,
        canal_voz: queue.channel?.id,
        cancion: `${track.title} — ${track.author}`,
        url: track.url
      })
      const channel = queue.metadata?.channel
      if (channel && 'send' in channel) {
        channel.send(`${this.emotes.error} No pude reproducir **${track.cleanTitle}**; intentaré con la siguiente canción.`).catch(console.error)
      }
    })

    this.player.events.on(GuildQueueEvent.PlayerSkip, (queue, track, reason, description) => {
      const error = new Error(`La pista fue omitida (${reason}): ${description}`)
      void this.functions.sendGemaError(error, {
        origen: 'pista omitida por el reproductor',
        servidor: queue.guild.id,
        canal_voz: queue.channel?.id,
        cancion: `${track.title} — ${track.author}`,
        url: track.url
      })
      const channel = queue.metadata?.channel
      if (channel && 'send' in channel) {
        channel.send(`${this.emotes.error} No pude iniciar **${track.cleanTitle}**. El error fue reportado.`).catch(console.error)
      }
    })
  }

  /**
   * Sube el bitrate del encoder Opus al máximo que permite el canal de voz.
   * `queue.node.setBitrate()` (de discord-player) delega en `@discord-player/opus`, cuyo
   * `setBitrate` espera un método `applyEncoderCTL`/`encoderCTL` en el encoder nativo; la versión
   * de `mediaplex` instalada solo expone `applyEncoderCtl` (minúscula) y `setBitrate` propio, así
   * que ese wrapper revienta con un TypeError. Llamamos directamente al encoder nativo para evitarlo.
   */
  private bumpEncoderBitrate(queue: GuildQueue) {
    try {
      const nativeEncoder = (
        queue.dispatcher?.audioResource?.encoder as
          | { encoder?: { setBitrate?: (bitrate: number) => void } }
          | null
          | undefined
      )?.encoder
      if (typeof nativeEncoder?.setBitrate === 'function') {
        nativeEncoder.setBitrate(queue.channel?.bitrate ?? 64_000)
      }
    } catch (err) {
      void this.functions.sendGemaError(err as Error, {
        origen: 'ajuste de bitrate del reproductor',
        servidor: queue.guild.id
      })
    }
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
      await rest.put(
        Routes.applicationGuildCommands(config.clientID, targetGuildId),
        { body: commands }
      )
        .then(() =>
          console.log(`[✅] Comandos slash cargados para el servidor ${targetGuildId}`)
        )
        .catch(console.error);
    } else {
      await rest.put(
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
      } else {
        console.log(`[⚠️] El botón ${file} no está configurado`)
        continue
      }
    }

    const selmFiles = fs
      .readdirSync(join(__dirname, '../components/selectmenus'))

    for (const file of selmFiles) {
      const filePath = `../components/selectmenus/${file}`;
      const selectmenu: GSelectMenu = (await import(filePath))?.default;

      if (selectmenu) {
        this.globalSelectMenus.set(selectmenu.customId, selectmenu)
      } else {
        console.log(`[⚠️] El menú de selección ${file} no está configurado`)
        continue
      }
    }

    const modalFiles = fs
      .readdirSync(join(__dirname, '../components/modals'))

    for (const file of modalFiles) {
      const filePath = `../components/modals/${file}`;
      const modal: GModal = (await import(filePath))?.default;

      if (modal) {
        this.modals.set(modal.customId, modal)
      } else {
        console.log(`[⚠️] El modal ${file} no está configurado`)
        continue
      }
    }
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

  /** Refresca `this.embeds` con los embeds guardados en Mongo. */
  public async syncEmbeds() {
    try {
      this.embeds = await embedModel.find({}).exec()
    } catch (error) {
      console.error('[⚠️] No se pudieron sincronizar los embeds desde MongoDB:', error)
    }
  }

  /**
   * Refresca `this.selectmenus` con los selectmenus guardados por servidor en Mongo.
   * No confundir con `globalSelectMenus`, que son los cargados desde `components/selectmenus`.
   */
  public async syncSelectMenus() {
    try {
      this.selectmenus = await selectmenuModel.find({}).exec()
    } catch (error) {
      console.error('[⚠️] No se pudieron sincronizar los selectmenus desde MongoDB:', error)
    }
  }

  /** Refresca `this.messages` con los mensajes guardados en Mongo. */
  public async syncMessages() {
    try {
      this.messages = await messageModel.find({}).exec()
    } catch (error) {
      console.error('[⚠️] No se pudieron sincronizar los mensajes desde MongoDB:', error)
    }
  }

  /** Refresca `this.autoresponders` con los autoresponders guardados en Mongo. */
  public async syncAutoresponders() {
    try {
      this.autoresponders = await autoresponderModel.find({}).exec()
    } catch (error) {
      console.error('[⚠️] No se pudieron sincronizar los autoresponders desde MongoDB:', error)
    }
  }

  public async syncComponents() {
    await Promise.all([
      this.syncButtons(),
      this.syncEmbeds(),
      this.syncSelectMenus(),
      this.syncMessages(),
      this.syncAutoresponders()
    ])
  }

  /**
   * Registra un botón directamente desde un comando, sin necesidad de guardarlo en la base de datos
   * ni crear un archivo en `components/buttons`. Útil para botones cuya lógica sólo le importa al
   * comando que los creó (ej. un botón "Regenerar" con un customId único por interacción).
   *
   * Usa `prefix: true` en el `GButton` para que reaccione a cualquier customId que empiece con el suyo.
   * Si se pasa `ttl`, el botón se elimina automáticamente pasado ese tiempo (en ms) para no acumular
   * handlers de botones que ya expiraron.
   */
  public registerButton(button: GButton, options?: { ttl?: number }): GButton {
    this.transientButtons.set(button.customId, button)

    if (options?.ttl) {
      setTimeout(() => this.transientButtons.delete(button.customId), options.ttl)
    }

    return button
  }

  /**
   * Busca el botón que debe manejar un customId, ya sea uno registrado en caliente (`registerButton`),
   * uno global (`components/buttons`) o uno guardado en la base de datos (`buttonModel`).
   * Soporta coincidencia exacta y, para botones con `prefix: true`, coincidencia por prefijo,
   * devolviendo en `params` lo que sigue del customId después del prefijo.
   */
  public resolveButton(customId: string): { button: GButton, params?: string } | undefined {
    const exactTransient = this.transientButtons.get(customId)
    if (exactTransient) return { button: exactTransient }

    const prefixedTransient = this.transientButtons.find(b => b.prefix === true && customId.startsWith(b.customId))
    if (prefixedTransient) return { button: prefixedTransient, params: customId.slice(prefixedTransient.customId.length) }

    const exact = this.buttons.get(customId)
    if (exact) return { button: exact }

    const prefixed = this.buttons.find(b => b.prefix === true && customId.startsWith(b.customId))
    if (prefixed) return { button: prefixed, params: customId.slice(prefixed.customId.length) }

    return undefined
  }

  /** Igual que `registerButton` pero para un `GSelectMenu` global (ver `resolveSelectMenu`). */
  public registerSelectMenu(selectmenu: GSelectMenu, options?: { ttl?: number }): GSelectMenu {
    this.transientSelectMenus.set(selectmenu.customId, selectmenu)

    if (options?.ttl) {
      setTimeout(() => this.transientSelectMenus.delete(selectmenu.customId), options.ttl)
    }

    return selectmenu
  }

  /**
   * Igual que `resolveButton` pero para selectmenus globales del bot (`components/selectmenus` o
   * registrados con `registerSelectMenu`). Los selectmenus guardados por servidor en Mongo
   * (`client.selectmenus`) siguen resolviéndose por su cuenta en `interactionCreate.ts`.
   */
  public resolveSelectMenu(customId: string): { selectmenu: GSelectMenu, params?: string } | undefined {
    const exactTransient = this.transientSelectMenus.get(customId)
    if (exactTransient) return { selectmenu: exactTransient }

    const prefixedTransient = this.transientSelectMenus.find(s => s.prefix === true && customId.startsWith(s.customId))
    if (prefixedTransient) return { selectmenu: prefixedTransient, params: customId.slice(prefixedTransient.customId.length) }

    const exact = this.globalSelectMenus.get(customId)
    if (exact) return { selectmenu: exact }

    const prefixed = this.globalSelectMenus.find(s => s.prefix === true && customId.startsWith(s.customId))
    if (prefixed) return { selectmenu: prefixed, params: customId.slice(prefixed.customId.length) }

    return undefined
  }

  /** Igual que `registerButton` pero para un `GModal` global (ver `resolveModal`). */
  public registerModal(modal: GModal, options?: { ttl?: number }): GModal {
    this.transientModals.set(modal.customId, modal)

    if (options?.ttl) {
      setTimeout(() => this.transientModals.delete(modal.customId), options.ttl)
    }

    return modal
  }

  /** Igual que `resolveButton` pero para el `run` que debe manejar el envío de un modal (`components/modals` o `registerModal`). */
  public resolveModal(customId: string): { modal: GModal, params?: string } | undefined {
    const exactTransient = this.transientModals.get(customId)
    if (exactTransient) return { modal: exactTransient }

    const prefixedTransient = this.transientModals.find(m => m.prefix === true && customId.startsWith(m.customId))
    if (prefixedTransient) return { modal: prefixedTransient, params: customId.slice(prefixedTransient.customId.length) }

    const exact = this.modals.get(customId)
    if (exact) return { modal: exact }

    const prefixed = this.modals.find(m => m.prefix === true && customId.startsWith(m.customId))
    if (prefixed) return { modal: prefixed, params: customId.slice(prefixed.customId.length) }

    return undefined
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
