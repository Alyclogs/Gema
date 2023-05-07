const mongoose = require('mongoose')

const currency = new mongoose.Schema({
  userId: { type: String, required: true },
  balance: Number
})

const model = new mongoose.model('user-currency', currency)

module.exports = model