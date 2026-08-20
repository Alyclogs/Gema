import mongoose from 'mongoose'

export class ServerConfig {
  constructor(configOptions: ServerConfigOptions) {
    Object.assign(this, configOptions);
  }
}

export class WelcomerSettings implements welcomerSettings {
  channel = '';
  message?: string;
  embed?: {
    name?: string,
    color?: string
  };
}

export class FarewellSettings implements farewellSettings {
  channel?: string;
  message?: string;
  embed?: {
    name?: string,
    color?: string
  };
}

export class BoostSettings implements boostSettings {
  channel?: string;
  message?: string;
  embed?: {
    name?: string,
    color?: string
  };
}

export interface ServerConfigOptions {
  guildId: string
  prefix: string
  welcomerSettings?: welcomerSettings
  farewellSettings?: farewellSettings
  boostSettings?: boostSettings
}

interface welcomerSettings {
  channel?: string
  message?: string
  embed?: {
    name?: string,
    color?: string
  }
}

interface farewellSettings {
  channel?: string
  message?: string
  embed?: {
    name?: string,
    color?: string
  }
}

interface boostSettings {
  channel?: string
  message?: string
  embed?: {
    name?: string,
    color?: string
  }
}

const serverconfig = new mongoose.Schema<ServerConfigOptions>({
  guildId: { type: String, required: true }, prefix: String,
  welcomerSettings: { type: Object },
  farewellSettings: { type: Object },
  boostSettings: { type: Object }
})

export const model = mongoose.model<ServerConfigOptions>('config-servers', serverconfig)

export async function ensureServerConfig(guildId: string, prefix = 'g.') {
  return model.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId, prefix } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec()
}