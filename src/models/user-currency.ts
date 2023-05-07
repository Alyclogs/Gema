import mongoose from 'mongoose'

export interface UserCurrency {
  userId: string,
  balance?: number
}

const currency = new mongoose.Schema<UserCurrency>({
  userId: { type: String, required: true },
  balance: Number
})

export const model = mongoose.model<UserCurrency>('user-currency', currency)