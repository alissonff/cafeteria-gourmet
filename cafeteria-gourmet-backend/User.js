const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the User schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // ensures email addresses are unique in the database
    },
    password: {
        type: String,
        required: true
    }
});

// Pre-save hook to hash the password before saving it to the database
userSchema.pre('save', function(next) {
    if (this.isModified('password')) {
        this.password = bcrypt.hashSync(this.password, 12); // hash the password
    }
    next();
});

// Compile the schema into a model
const User = mongoose.model('User', userSchema);

module.exports = User;
