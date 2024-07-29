const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const crypto = require('crypto');

// Initialize express app
const app = express();
const port = 3000;

// Load whitelist and admin lists
const whitelist = JSON.parse(fs.readFileSync('whitelist.json', 'utf8'));
const adminList = JSON.parse(fs.readFileSync('admin.json', 'utf8'));

const userRegistrationDates = {}; // This should be replaced with a proper database in production

passport.use(new DiscordStrategy({
    clientID: '1230902267646050344',
    clientSecret: 'SQxaKbB_fcqv-3tfZC5C9W5WsBNTi8ju',
    callbackURL: 'http://localhost:3000/auth/discord/callback',
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    const userId = profile.id;
    // Set registration date if it doesn't already exist
    if (!userRegistrationDates[userId]) {
        userRegistrationDates[userId] = new Date();
    }
    return done(null, { profile, accessToken, createdAt: userRegistrationDates[userId] });
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Set up session and passport
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up multer for file upload handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.user ? req.user.profile.id : 'guest';
        const dir = path.join(__dirname, 'uploads', userId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const randomName = crypto.randomBytes(4).toString('hex'); // 8 characters
        cb(null, `${randomName}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static files from the public directory
app.use(express.static('public'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to check whitelist
app.use((req, res, next) => {
    if (req.user && !whitelist.includes(req.user.profile.id)) {
        return res.status(403).render('accessDenied');
    }
    next();
});

// Authentication routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err); // Handle errors if logout fails
        }
        res.redirect('/');
    });
});

// Route to render the login page
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/dashboard', (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }

    const user = req.user.profile;
    user.createdAt = req.user.createdAt; // Ensure `createdAt` is included
    const userId = user.id;

    // Calculate total uploaded files
    const userDir = path.join(__dirname, 'uploads', userId);
    let totalFiles = 0;
    if (fs.existsSync(userDir)) {
        totalFiles = fs.readdirSync(userDir).filter(file => fs.statSync(path.join(userDir, file)).isFile()).length;
    }
    user.totalFiles = totalFiles;

    // Check if the user is an admin
    const isAdmin = adminList.includes(userId);

    // Read the MOTD from the file
    fs.readFile('/home/keiran/motd.txt', 'utf8', (err, motd) => {
        if (err) {
            console.error('Error reading MOTD:', err);
            motd = 'Welcome to the dashboard!';
        }
        res.render('dashboard', { user, motd, isAdmin });
    });
});

app.get('/upload', (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    const isAdmin = adminList.includes(req.user.profile.id);
    res.render('upload', { user: req.user.profile, isAdmin });
});

// Endpoint for file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded successfully: ${req.file.originalname}`);
});

// Route to render the gallery page
app.get('/gallery', (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }

    const userId = req.user.profile.id;
    const userDir = path.join(__dirname, 'uploads', userId);
    const isAdmin = adminList.includes(userId);

    fs.readdir(userDir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to read the directory.');
        }
        // Filter out directories if any
        files = files.filter(file => fs.statSync(path.join(userDir, file)).isFile());
        res.render('gallery', { user: req.user.profile, files, isAdmin });
    });
});

// Route to handle file deletion
app.delete('/uploads/:userId/:file', (req, res) => {
    const { userId, file } = req.params;
    const filePath = path.join(__dirname, 'uploads', userId, file);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Failed to delete the file.');
        }
        res.send('File deleted');
    });
});

// Route to render the admin panel
app.get('/admin', (req, res) => {
    if (!req.user || !adminList.includes(req.user.profile.id)) {
        return res.status(403).send('Access denied.');
    }
    const isAdmin = adminList.includes(req.user.profile.id);
    res.render('admin', { user: req.user.profile, isAdmin });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

