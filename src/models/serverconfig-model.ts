import mongoose from 'mongoose'

export class ServerConfig {
  constructor(configOptions: ServerConfigOptions) {
    Object.assign(this, configOptions);
  }
}

export class WelcomerSettings implements welcomerSettings {
  channel = '';
  message = '';
  embed = { name: "", color: "string" };

}

export class FarewellSettings implements farewellSettings {
  channel = '';
  message = '';
  embed = '';
}

export class BoostSettings implements boostSettings {
  channel = '';
  message = '';
  embed = '';
}

export interface ServerConfigOptions {
  guildId: string
  prefix: string
  welcomerSettings?: welcomerSettings
  farewellSettings?: farewellSettings
  boostSettings?: boostSettings
}

interface welcomerSettings {
  channel: string
  message: string
  embed: {
    name: string,
    color: string
  }
}

interface farewellSettings {
  channel: string
  message: string
  embed: string
}

interface boostSettings {
  channel: string
  message: string
  embed: string
}

const serverconfig = new mongoose.Schema<ServerConfigOptions>({
  guildId: { type: String, required: true }, prefix: String,
  welcomerSettings: { type: Object, default: { channel: String, message: String, embed: { name: String, color: String } } },
  farewellSettings: { type: Object, default: { channel: String, message: String, embed: String } },
  boostSettings: { type: Object, default: { channel: String, message: String, embed: String } }
})

export const model = mongoose.model<ServerConfigOptions>('config-servers', serverconfig)