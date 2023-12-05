const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./User'); // Ensure this path is correct

const app = express();

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/cafeteriaGourmetDB';

mongoose.connect(mongoURI)
   .then(() => console.log('Conexão com MongoDB bem-sucedida!'))
   .catch(err => console.error('Falha ao conectar com MongoDB', err));

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: 'your_secret_key', // Replace with a real secret in production
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 3600000 } // Session expiration: 1 hour
}));

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        console.log('User is authenticated');
        next();
    } else {
        console.log('User is not authenticated. Redirecting to login...');
        console.log('Session:', req.session);
        res.redirect('/login');
    }
}


// Serve static files from 'public' directory
app.use(express.static('public'));

app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'cafeteria-gourmet/public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/client', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'client.html'));
});

// Signup route
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists with this email');
        }

        // Create and save the new user
        const user = new User({ name, email, password });
        await user.save();

        res.status(201).send('User registered successfully');
    } catch (error) {
        console.error('Signup Error:', error.message);
        res.status(500).send('Error registering new user');
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // User not found
            return res.status(401).send('Email ou senha incorretos');
        }

        // Compare the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Password does not match
            return res.status(401).send('Email ou senha incorretos');
        }

        // User authenticated, create a session
        req.session.user = { id: user._id, name: user.name, email: user.email };

        // Redirect to the personalized user page
        res.redirect('/client');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Erro durante o login');
    }
});



app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out successfully');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
   console.log(`Servidor rodando na porta ${PORT}`);
});

// Get the current cart
app.get('/api/cart', (req, res) => {
    if (!req.session.cart) {
        return res.status(400).send('Cart not initialized');
    }
    res.json(req.session.cart);
});

// Add an item to the cart
app.post('/api/cart/add', (req, res) => {
    const { itemId, quantity } = req.body; // Adjust these fields based on your frontend
    const item = { itemId, quantity }; // You might want to fetch more item details from the database

    if (!req.session.cart) {
        return res.status(400).send('Cart not initialized');
    }

    req.session.cart.push(item);
    res.send('Item added to cart');
});

// Remove an item from the cart
app.post('/api/cart/remove', (req, res) => {
    const { itemId } = req.body;

    if (!req.session.cart) {
        return res.status(400).send('Cart not initialized');
    }

    req.session.cart = req.session.cart.filter(item => item.itemId !== itemId);
    res.send('Item removed from cart');
});
