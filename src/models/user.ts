import mongoose from 'mongoose'

export interface UserSettings {
  locale?: string
  timezone?: string
  directMessages?: boolean
}

export interface UserEconomy {
  balance: number
}

export interface User {
  userId: string
  settings: UserSettings
  economy?: UserEconomy
  createdAt?: Date
  updatedAt?: Date
}

const settingsSchema = new mongoose.Schema<UserSettings>({
  locale: String,
  timezone: String,
  directMessages: Boolean
}, { _id: false })

const economySchema = new mongoose.Schema<UserEconomy>({
  balance: { type: Number, default: 0, min: 0 }
}, { _id: false })

const userSchema = new mongoose.Schema<User>({
  userId: { type: String, required: true, unique: true, index: true },
  settings: { type: settingsSchema, default: () => ({}) },
  economy: { type: economySchema, default: undefined }
}, { timestamps: true, collection: 'users' })

export const model = mongoose.model<User>('User', userSchema)

export async function ensureUser(userId: string) {
  return model.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, settings: {} } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec()
}