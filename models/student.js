const mongoose = require('mongoose');
const studentSchema = new mongoose.Schema({
    name: {
        type: String
    },
    studentid: {
        type: String
    },
    issuedBooks: {
        type: [String]
    }
})

module.exports = mongoose.model('Student', studentSchema);