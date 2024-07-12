const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({
    isbn: {
        type: String
    },
    name: {
        type: String
    },
    author: {
        type: String
    },
    quantity: {
        type: Number
    }
})

module.exports = mongoose.model('Book', bookSchema);