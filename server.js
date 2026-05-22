const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newspaper';
const PORT = Number(process.env.PORT) || 3000;

// Connect to MongoDB
mongoose.connect(MONGODB_URI);

// Define Schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    address: String,
    phone: String,
    area: String,
    createdAt: { type: Date, default: Date.now }
});

const NewspaperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    newspaper: { type: mongoose.Schema.Types.ObjectId, ref: 'Newspaper' }, // Changed from String
    price: Number,
    deliveryPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'active' },
    paid: { type: Boolean, default: false },
    lastPaymentDate: Date,
    createdAt: { type: Date, default: Date.now },
    pauseDates: [{
        startDate: Date,
        endDate: Date,
        createdAt: { type: Date, default: Date.now }
    }],
    isPaused: { type: Boolean, default: false },
    count: { type: Number, default: 1 },
    deliveryHistory: [{
        date: Date,
        completed: Boolean,
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    renewalDate: Date,
    autoRenew: { type: Boolean, default: true }
});

const MessageSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

const User = mongoose.model('User', UserSchema);
const Newspaper = mongoose.model('Newspaper', NewspaperSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Message = mongoose.model('Message', MessageSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevent JavaScript access to cookies
        sameSite: 'strict' // Prevent CSRF attacks
    }
}));

// Add a middleware to check session timeout
app.use((req, res, next) => {
    if (req.session.user) {
        const lastActivity = req.session.lastActivity || Date.now();
        const timeout = 30 * 60 * 1000; // 30 minutes timeout

        if (Date.now() - lastActivity > timeout) {
            // Session timeout - destroy session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
                res.clearCookie('connect.sid');
                return res.redirect('/login?timeout=1');
            });
        } else {
            // Update last activity
            req.session.lastActivity = Date.now();
            next();
        }
    } else {
        next();
    }
});

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        // Clear any existing session data
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.clearCookie('connect.sid');
            return res.redirect('/login');
        });
    } else {
        next();
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.session.user?.role !== role) return res.redirect('/login');
        next();
    };
};

// Add common CSS styles at the top of the file
const commonStyles = `
                    :root {
                        --primary: #4361ee;
                        --secondary: #3f37c9;
                        --accent: #4895ef;
                        --success: #4cc9f0;
                        --warning: #f72585;
                        --danger: #b5179e;
                        --light: #f8f9fa;
                        --dark: #212529;
                        --text: #2b2d42;
                        --bg-gradient: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
                    }

    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

                    body {
                        font-family: 'Poppins', sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f0f2f5;
                        color: var(--text);
                        line-height: 1.6;
                    }

                    .dashboard-container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                    }

    /* Header Styles */
    .cool-header {
                        background: var(--bg-gradient);
        padding: 20px 0;
                        margin-bottom: 30px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }

    .logo {
        font-size: 24px;
                        font-weight: 700;
        color: white;
    }

    .logo span {
        color: var(--accent);
    }

    /* Dashboard Sections */
                    .dashboard-section {
                        background: white;
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 30px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                        border: 1px solid rgba(0,0,0,0.05);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }

                    .dashboard-section:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    }

                    .section-title {
                        color: var(--primary);
                        margin-bottom: 20px;
                        font-size: 1.5rem;
                        font-weight: 600;
                        position: relative;
                        padding-bottom: 10px;
                    }

                    .section-title::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 50px;
                        height: 3px;
                        background: var(--accent);
                        border-radius: 3px;
                    }

    /* Forms */
    .form-control {
                        width: 100%;
        padding: 12px 15px;
        border: 2px solid #e9ecef;
                        border-radius: 8px;
        font-size: 15px;
                        margin-bottom: 15px;
        transition: all 0.3s ease;
    }

    .form-control:focus {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 0 0 3px rgba(72, 149, 239, 0.2);
    }

    textarea.form-control {
        min-height: 100px;
        resize: vertical;
                    }

                    /* Buttons */
                    .btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: none;
                        font-size: 14px;
                        margin-right: 10px;
                        margin-bottom: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }

                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 7px 14px rgba(0,0,0,0.15);
                    }

                    .btn:active {
                        transform: translateY(0);
                    }

                    .btn-primary {
                        background: var(--primary);
                        color: white;
                    }

                    .btn-primary:hover {
                        background: var(--secondary);
                    }

    .btn-secondary {
        background: #6c757d;
        color: white;
    }

    .btn-danger {
        background: var(--danger);
        color: white;
    }

                    .btn-success {
                        background: var(--success);
                        color: white;
                    }

    /* Tables */
    .table-responsive {
        width: 100%;
        overflow-x: auto;
        margin: 20px 0;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .data-table th,
    .data-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        white-space: nowrap;
    }

    .data-table th {
        background: var(--primary);
                        color: white;
        font-weight: 600;
    }

    .data-table tr:hover {
        background-color: #f8f9fa;
                    }

                    /* Status Badges */
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 600;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .paid {
        background: var(--success);
        color: white;
                    }

                    .overdue {
        background: var(--danger);
        color: white;
    }

    .due {
        background: var(--warning);
        color: white;
                    }

                    .paused {
                        background: #ffdeeb;
                        color: var(--warning);
                    }

    /* Message Styles */
    .messages-section {
        background: white;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 30px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    }

    .message-item {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 15px;
                        margin-bottom: 15px;
        border-left: 4px solid var(--primary);
    }

    .message-item.unread {
        background: #e3f2fd;
        border-left-color: var(--accent);
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .message-sender {
        font-weight: 600;
        color: var(--primary);
    }

    .message-date {
        color: #666;
        font-size: 0.9rem;
    }

    .message-content {
        color: var(--text);
        line-height: 1.5;
    }

    /* Notification Styles */
    .notification {
        padding: 15px;
        margin-bottom: 20px;
                        border-radius: 8px;
        animation: slideIn 0.5s ease-out;
    }

    .notification.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .notification.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }

    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
                    }

                    /* Logout Button */
                    .logout-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                    }

                    .logout-btn {
                        background: var(--danger);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    }

                    .logout-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 7px 14px rgba(0,0,0,0.15);
                    }

    /* Modal Styles */
    .message-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1001;
    }

    .message-modal-content {
        position: relative;
        background: white;
        width: 90%;
        max-width: 500px;
        margin: 50px auto;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .message-modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    /* Delivery Stats */
    .delivery-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }

    .delivery-stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-left: 4px solid var(--accent);
    }

    .delivery-stat-card h3 {
        color: var(--primary);
        margin: 0 0 15px 0;
        font-size: 1.2rem;
    }

    .delivery-stat-card p {
        margin: 8px 0;
        color: var(--text);
    }

    .delivery-stat-card .stat-value {
        font-weight: 600;
        color: var(--primary);
    }

    /* Customer List */
    .customer-list {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }

    .customer-list h4 {
        color: var(--primary);
        margin-bottom: 15px;
    }

    .customer-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .customer-list li {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .customer-list li strong {
        color: var(--primary);
        display: block;
        margin-bottom: 5px;
    }

    .customer-list li p {
        margin: 5px 0;
        font-size: 0.9rem;
        color: var(--text);
    }

    /* Area Tag */
    .area-tag {
        display: inline-block;
        background: var(--accent);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9rem;
        margin-left: 5px;
    }

    /* Subscription Count */
    .subscription-count {
        display: inline-block;
        background: var(--accent);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        margin-left: 8px;
        font-weight: 600;
    }

    /* Responsive Design */
                    @media (max-width: 768px) {
        .dashboard-container {
            padding: 10px;
        }

        .dashboard-section {
            padding: 15px;
        }

        .delivery-stats-grid {
                            grid-template-columns: 1fr;
                        }
                        
        .table-responsive {
            margin: 10px -15px;
        }

        .data-table th,
        .data-table td {
            padding: 8px 10px;
        }

        .btn {
            width: 100%;
            margin-bottom: 10px;
        }
    }

    /* Total Price Styles */
    .total-price {
        display: inline-block;
        background: var(--success);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        margin-left: 8px;
        font-weight: 600;
    }

    .renewal-section {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-top: 15px;
    }

    .renewal-section h4 {
        color: var(--primary);
        margin-bottom: 10px;
    }

    .renewal-section label {
        display: block;
        margin: 10px 0;
    }

    .renewal-section input[type="checkbox"] {
        margin-right: 8px;
    }

    .btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
`;

// Add these security headers middleware at the top of the file, after the existing middleware
app.use((req, res, next) => {
    // Prevent caching of authenticated pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
});

// Add this layout template function at the top of the file, after the commonStyles
const generateLayout = (title, content, user) => `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title} - Daily Pulse</title>
        <style>
            ${commonStyles}
            /* Add these new styles for the common layout */
            .page-container {
                min-height: 100vh;
                display: flex;
                flex-direction: column;
            }

            .main-content {
                flex: 1;
                padding: 20px 0;
            }

            .footer {
                background: var(--dark);
                color: white;
                padding: 20px 0;
                margin-top: auto;
            }

            .footer-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
                text-align: center;
            }

            .footer p {
                margin: 5px 0;
                font-size: 0.9rem;
            }

            .nav-menu {
                background: white;
                padding: 10px 0;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }

            .nav-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .nav-links {
                display: flex;
                gap: 20px;
                align-items: center;
            }

            .nav-links a {
                color: var(--text);
                text-decoration: none;
                font-weight: 500;
                transition: color 0.3s ease;
            }

            .nav-links a:hover {
                color: var(--primary);
            }

            .nav-links a.active {
                color: var(--primary);
                font-weight: 600;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .welcome-text {
                color: var(--text);
                font-weight: 500;
            }

            .welcome-text span {
                color: var(--primary);
                font-weight: 600;
            }

            .logout-btn {
                background: var(--danger);
                color: white;
                padding: 8px 15px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .logout-btn:hover {
                background: #a4123f;
                transform: translateY(-2px);
                    }
                </style>
            </head>
            <body>
        <div class="page-container">
                <header class="cool-header">
                    <div class="header-content">
                        <div class="logo">DAILY<span>PULSE</span></div>
                    </div>
                </header>

            ${user ? `
                <nav class="nav-menu">
                    <div class="nav-content">
                        <div class="nav-links">
                            <a href="/${user.role}/dashboard" class="active">Dashboard</a>
                            ${user.role === 'customer' ? `
                                <a href="/generate-bill/${user._id}" target="_blank">Print Bill</a>
                            ` : ''}
                        </div>
                        <div class="user-info">
                            <div class="welcome-text">Welcome, <span>${user.name}</span></div>
                            <a href="/logout" class="logout-btn">Logout</a>
                        </div>
                    </div>
                </nav>
            ` : ''}

            <div class="main-content">
                <div class="dashboard-container">
                    ${content}
                </div>
            </div>

            <footer class="footer">
                <div class="footer-content">
                    <p>© ${new Date().getFullYear()} Daily Pulse. All rights reserved.</p>
                    <p>Contact us: support@dailypulse.com</p>
                </div>
            </footer>
        </div>
    </body>
    </html>
`;

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.sendFile(__dirname + '/views/home.html');
});

// Login/Register Routes
app.get('/login', (req, res) => {
    const timeout = req.query.timeout;
    const content = `
        ${timeout ? '<div class="timeout-message">Your session has expired. Please login again.</div>' : ''}
        <div class="dashboard-section">
            <h2>Login</h2>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email" class="form-control" required>
                <input type="password" name="password" placeholder="Password" class="form-control" required>
                <select name="role" class="form-control" required>
                    <option value="">Select Role</option>
                    <option value="customer">Customer</option>
                    <option value="manager">Manager</option>
                    <option value="delivery">Delivery Person</option>
                </select>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <p style="margin-top: 20px;">Don't have an account? <a href="/register">Register here</a></p>
        </div>
    `;
    res.send(generateLayout('Login', content));
});

app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.send(`
                <script>
                    alert('User not found. Please check your email and role.');
                    window.location.href = '/login';
                </script>
            `);
        }
        if (!await bcrypt.compare(password, user.password)) {
            return res.send(`
                <script>
                    alert('Incorrect password. Please try again.');
                    window.location.href = '/login';
                </script>
            `);
        }
        req.session.user = user;
        res.redirect(`/${role}/dashboard`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/register', (req, res) => {
    const content = `
        <div class="dashboard-section">
            <h2>Register</h2>
            <form action="/register" method="POST">
                <input type="text" name="name" placeholder="Name" class="form-control" required>
                <input type="email" name="email" placeholder="Email" class="form-control" required>
                <input type="password" name="password" placeholder="Password" class="form-control" required>
                <input type="tel" name="phone" placeholder="Phone" class="form-control">
                <select name="role" class="form-control" required>
                    <option value="">Select Role</option>
                    <option value="customer">Customer</option>
                    <option value="manager">Manager</option>
                    <option value="delivery">Delivery Person</option>
                </select>
                <button type="submit" class="btn btn-primary">Register</button>
            </form>
            <p style="margin-top: 20px;">Already have an account? <a href="/login">Login here</a></p>
        </div>
    `;
    res.send(generateLayout('Register', content));
});

app.post('/register', async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    try {
        // Password validation
        if (!password || password.length < 8) {
            return res.send(`
                <script>
                    alert('Password must be at least 8 characters long.');
                    window.location.href = '/register';
                </script>
            `);
        }

        // Check for at least one uppercase letter
        if (!/[A-Z]/.test(password)) {
            return res.send(`
                <script>
                    alert('Password must contain at least one uppercase letter.');
                    window.location.href = '/register';
                </script>
            `);
        }

        // Check for at least one lowercase letter
        if (!/[a-z]/.test(password)) {
            return res.send(`
                <script>
                    alert('Password must contain at least one lowercase letter.');
                    window.location.href = '/register';
                </script>
            `);
        }

        // Check for at least one number
        if (!/[0-9]/.test(password)) {
            return res.send(`
                <script>
                    alert('Password must contain at least one number.');
                    window.location.href = '/register';
                </script>
            `);
        }

        // Check for at least one special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return res.send(`
                <script>
                    alert('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>).');
                    window.location.href = '/register';
                </script>
            `);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role, phone });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        if (err.code === 11000) {
            return res.send(`
                <script>
                    alert('Email already exists. Please use a different email.');
                    window.location.href = '/register';
                </script>
            `);
        }
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/pause-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { id, startDate, endDate } = req.body;
        await Subscription.findByIdAndUpdate(id, {
            $push: {
                pauseDates: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                }
            },
            isPaused: true
        });
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Pause subscription error:', err);
        res.status(500).send('Error pausing subscription');
    }
});

app.post('/resume-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { id } = req.body;
        await Subscription.findByIdAndUpdate(id, {
            isPaused: false
        });
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Resume subscription error:', err);
        res.status(500).send('Error resuming subscription');
    }
});

app.get('/logout', (req, res) => {
    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Clear any session cookies
        res.clearCookie('connect.sid');
        // Clear browser cache
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        // Redirect to login page
        res.redirect('/login');
    });
});

// Add a middleware to prevent access to authenticated routes after logout
app.use((req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        // If trying to access a protected route without session, redirect to login
        res.redirect('/login');
    }
});

// Fix for customer dashboard newspaper display
app.get('/customer/dashboard', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        // Add no-cache headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const user = await User.findById(req.session.user._id);
        const newspapers = await Newspaper.find();
        const subscriptions = await Subscription.find({ user: user._id })
            .populate('newspaper')
            .populate('deliveryPerson');

        // Fetch messages for the customer
        const messages = await Message.find({ to: user._id })
            .populate('from', 'name')
            .sort({ createdAt: -1 });

        // Mark messages as read
        await Message.updateMany(
            { to: user._id, read: false },
            { read: true }
        );

        // Get success/error messages from session
        const successMessage = req.session.successMessage;
        const errorMessage = req.session.errorMessage;
        // Clear the messages after using them
        delete req.session.successMessage;
        delete req.session.errorMessage;

        const content = `
                    <h1>Welcome ${user.name}</h1>
            
            ${successMessage ? `
                <div class="notification success">
                    ${successMessage}
                </div>
            ` : ''}
            
            ${errorMessage ? `
                <div class="notification error">
                    ${errorMessage}
                </div>
            ` : ''}

            <!-- Messages Section -->
            <div class="messages-section">
                <h2>Messages from Manager</h2>
                ${messages.length > 0 ? messages.map(msg => `
                    <div class="message-item ${msg.read ? '' : 'unread'}">
                        <div class="message-header">
                            <span class="message-sender">${msg.from.name}</span>
                            <span class="message-date">${new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <div class="message-content">${msg.message}</div>
                    </div>
                `).join('') : '<p>No messages yet</p>'}
            </div>
                    
                    <div class="dashboard-section">
                        <h2>Delivery Address</h2>
                        <form action="/update-address" method="POST">
                    <textarea name="address" required class="form-control">${user.address || ''}</textarea>
                    <button type="submit" class="btn btn-primary">Update Address</button>
                        </form>
                    </div>
                    
                    <div class="dashboard-section">
                        <h2>Available Newspapers</h2>
                        <div class="newspaper-grid">
                            ${newspapers.map(np => `
                                <div class="newspaper-item">
                                    ${np.image ? `<img src="${np.image}" alt="${np.title}">` : '<div style="height:160px;background:#eee;margin-bottom:10px;"></div>'}
                                    <h3>${np.title}</h3>
                            <p>₹${np.price.toFixed(2)}</p>
                                    <form action="/subscribe" method="POST">
                                        <input type="hidden" name="newspaper" value="${np._id}">
                                        <button>Subscribe</button>
                                    </form>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="dashboard-section">
                        <h2>Your Subscriptions</h2>
                        ${subscriptions.map(sub => `
                            <div class="subscription-item ${sub.isPaused ? 'paused' : ''}">
                        <h3>${sub.newspaper?.title || 'Unknown Newspaper'} - ₹${sub.newspaper?.price?.toFixed(2) || '0.00'} 
                            ${sub.count > 1 ? `<span class="subscription-count">x${sub.count}</span>` : ''}
                            <span class="total-price">Total: ₹${(sub.newspaper?.price * sub.count).toFixed(2)}</span>
                        </h3>
                        <p>Status: <span class="status-badge ${sub.paid === true ? 'paid' : (sub.createdAt && (new Date() - sub.createdAt) > 24 * 60 * 60 * 1000) ? 'overdue' : 'due'}">
                            ${sub.paid === true ? 'Paid' : (sub.createdAt && (new Date() - sub.createdAt) > 24 * 60 * 60 * 1000) ? 'Overdue' : 'Due'}
                                </span></p>
                                ${sub.isPaused ? `
                                    <p class="paused-notice">Delivery Paused</p>
                                    ${sub.pauseDates && sub.pauseDates.length > 0 ? `
                                        <p>Paused from ${new Date(sub.pauseDates[0].startDate).toLocaleDateString()} 
                                        to ${new Date(sub.pauseDates[0].endDate).toLocaleDateString()}</p>
                                    ` : ''}
                                    <form action="/resume-subscription" method="POST">
                                        <input type="hidden" name="id" value="${sub._id}">
                                        <button class="resume-btn">Resume Delivery</button>
                                    </form>
                                ` : `
                                    <form action="/pause-subscription" method="POST" class="pause-form" onsubmit="return validatePauseDates(this)">
                                        <input type="hidden" name="id" value="${sub._id}">
                                        <label>Pause from:</label>
                                <input type="date" name="startDate" required min="${new Date().toISOString().split('T')[0]}">
                                        <label>to:</label>
                                <input type="date" name="endDate" required min="${new Date().toISOString().split('T')[0]}">
                                        <button class="pause-btn">Pause Delivery</button>
                                    </form>
                                `}
                                <p>Delivery Person: ${sub.deliveryPerson?.name || 'Not assigned'}</p>
                                <form action="/cancel-subscription" method="POST">
                                    <input type="hidden" name="id" value="${sub._id}">
                                    <button class="cancel-btn">Cancel Subscription</button>
                        </form>
                        ${sub.renewalDate && sub.renewalDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? `
                            <div class="renewal-section">
                                <h4>Subscription Renewal</h4>
                                <p>Your subscription is up for renewal on ${new Date(sub.renewalDate).toLocaleDateString()}</p>
                                <form action="/renew-subscription" method="POST">
                                    <input type="hidden" name="subscriptionId" value="${sub._id}">
                                    <label>
                                        <input type="checkbox" name="autoRenew" ${sub.autoRenew ? 'checked' : ''}>
                                        Auto-renew subscription
                                    </label>
                                    <button type="submit" class="btn btn-primary">Update Renewal Preference</button>
                                </form>
                            </div>
                        ` : ''}
                            </div>
                        `).join('')}
                        ${subscriptions.length === 0 ? '<p>You have no active subscriptions</p>' : ''}
                    </div>
            ${subscriptions.length > 0 ? `
                <div style="text-align: right; margin-bottom: 20px;">
                    <a href="/generate-bill/${user._id}" class="btn btn-primary" target="_blank">Print Bill</a>
                </div>
            ` : ''}
        `;
        res.send(generateLayout('Customer Dashboard', content, user));
    } catch (err) {
        console.error('Error in customer dashboard:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/manager/dashboard', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        // Add no-cache headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Get the current user
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return res.redirect('/login');
        }

        // Fetch all data with proper population
        const newspapers = await Newspaper.find().lean();
        const subscriptions = await Subscription.find()
            .populate({
                path: 'user',
                model: 'User',
                select: 'name email phone address'  // Added address to selected fields
            })
            .populate({
                path: 'newspaper',
                model: 'Newspaper',
                select: 'title price'
            })
            .populate({
                path: 'deliveryPerson',
                model: 'User',
                select: 'name email phone'
            })
            .lean();

        const deliveryPersons = await User.find({ role: 'delivery' }).select('name email phone').lean();
        const customers = await User.find({ role: 'customer' }).select('name email phone address').lean();  // Added address to selected fields

        // Calculate delivery person statistics
        const deliveryStats = {};
        deliveryPersons.forEach(dp => {
            deliveryStats[dp._id.toString()] = {
                name: dp.name,
                email: dp.email,
                phone: dp.phone,
                area: dp.area,
                totalCustomers: 0,
                totalSubscriptions: 0,
                totalAmount: 0,
                pausedDeliveries: 0,
                customers: []
            };
        });

        // Calculate statistics for each delivery person
        subscriptions.forEach(sub => {
            if (sub.deliveryPerson) {
                const dpId = sub.deliveryPerson._id.toString();
                if (deliveryStats[dpId]) {
                    deliveryStats[dpId].totalSubscriptions++;
                    deliveryStats[dpId].totalAmount += (sub.newspaper?.price || 0) * (sub.count || 1);
                    if (sub.isPaused) {
                        deliveryStats[dpId].pausedDeliveries++;
                    }

                    // Add customer details if not already added
                    if (sub.user && !deliveryStats[dpId].customers.find(c => c._id.toString() === sub.user._id.toString())) {
                        deliveryStats[dpId].customers.push({
                            _id: sub.user._id,
                            name: sub.user.name,
                            address: sub.user.address,
                            phone: sub.user.phone,
                            subscriptionCount: 1
                        });
                    } else if (sub.user) {
                        // Update subscription count for existing customer
                        const customer = deliveryStats[dpId].customers.find(c => c._id.toString() === sub.user._id.toString());
                        if (customer) {
                            customer.subscriptionCount++;
                        }
                    }
                }
            }
        });

        // Update total customers count
        Object.keys(deliveryStats).forEach(dpId => {
            deliveryStats[dpId].totalCustomers = deliveryStats[dpId].customers.length;
        });

        // Group subscriptions by customer
        const customerSubscriptions = {};
        subscriptions.forEach(sub => {
            if (!sub.user) return;
            const userId = sub.user._id.toString();
            if (!customerSubscriptions[userId]) {
                customerSubscriptions[userId] = {
                    user: sub.user,
                    subscriptions: [],
                    totalAmount: 0,
                    deliveryPerson: sub.deliveryPerson
                };
            }
            customerSubscriptions[userId].subscriptions.push(sub);
            customerSubscriptions[userId].totalAmount += (sub.newspaper?.price || 0) * (sub.count || 1);
        });

        // Update customer data with latest information
        customers.forEach(customer => {
            const userId = customer._id.toString();
            if (customerSubscriptions[userId]) {
                customerSubscriptions[userId].user = customer;  // Update with latest customer data
            }
        });

        // Get success/error messages from session
        const successMessage = req.session.successMessage;
        const errorMessage = req.session.errorMessage;
        // Clear the messages after using them
        delete req.session.successMessage;
        delete req.session.errorMessage;

        const content = `
            <h1>Manager Dashboard</h1>
            
            ${successMessage ? `
                <div class="notification success">
                    ${successMessage}
                </div>
            ` : ''}
            
            ${errorMessage ? `
                <div class="notification error">
                    ${errorMessage}
                    </div>
            ` : ''}
                    
            <!-- Newspaper Management -->
                    <div class="dashboard-section">
                        <h2 class="section-title">Newspaper Management</h2>
                        <div class="newspaper-form">
                            <form action="/add-newspaper" method="POST">
                                <input type="text" name="title" placeholder="Title" class="form-control" required>
                                <input type="text" name="image" placeholder="Image URL" class="form-control">
                                <input type="number" name="price" placeholder="Price" step="0.01" class="form-control" required>
                                <button type="submit" class="btn btn-primary">Add Newspaper</button>
                            </form>
                        </div>
                        <table class="newspaper-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Price</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newspapers.map(np => `
                                    <tr>
                                        <td>${np.title}</td>
                                <td>₹${np.price.toFixed(2)}</td>
                                        <td>
                                            <form action="/edit-newspaper" method="POST" style="display: inline-block;">
                                                <input type="hidden" name="id" value="${np._id}">
                                                <input type="text" name="title" value="${np.title}" class="form-control" required>
                                                <input type="number" name="price" value="${np.price}" step="0.01" class="form-control" required>
                                                <button type="submit" class="btn btn-primary">Update</button>
                                            </form>
                                            <form action="/delete-newspaper" method="POST" style="display: inline-block; margin-left: 8px;">
                                                <input type="hidden" name="id" value="${np._id}">
                                                <button type="submit" class="btn btn-danger">Delete</button>
                                            </form>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Customer Subscriptions -->
                    <div class="dashboard-section">
                        <h2 class="section-title">Customer Subscriptions</h2>
                        <div class="subscription-grid">
                    ${Object.values(customerSubscriptions).map(customerSub => `
                                <div class="subscription-card">
                            <h3 class="customer-name">${customerSub.user.name}</h3>
                            <p class="customer-meta"><strong>Email:</strong> ${customerSub.user.email}</p>
                            <p class="customer-meta"><strong>Phone:</strong> ${customerSub.user.phone || 'Not provided'}</p>
                            <p class="customer-meta"><strong>Address:</strong> ${customerSub.user.address || 'Not provided'}</p>
                                    
                                    <!-- User-level delivery person assignment -->
                                    <form action="/assign-delivery-to-user" method="POST" class="user-assignment-form">
                                <input type="hidden" name="userId" value="${customerSub.user._id}">
                                        <label><strong>Assign Delivery Person:</strong></label>
                                        <select name="deliveryPerson" class="form-control">
                                            <option value="">-- Select Delivery Person --</option>
                                            ${deliveryPersons.map(dp => `
                                        <option value="${dp._id}" ${customerSub.deliveryPerson?._id?.toString() === dp._id.toString() ? 'selected' : ''}>
                                                    ${dp.name}
                                                </option>
                                            `).join('')}
                                        </select>
                                        <button type="submit" class="btn btn-primary">
                                            Update All Subscriptions
                                        </button>
                                    </form>
                                    
                                    <div class="subscription-details">
                                        <p><strong>Current Delivery Person:</strong> 
                                    ${customerSub.deliveryPerson?.name || 'Not assigned'}
                                </p>
                                <p><strong>Total:</strong> ₹${customerSub.totalAmount.toFixed(2)}</p>
                                        
                                        <h4>Subscriptions:</h4>
                                        <ul>
                                    ${customerSub.subscriptions.map(sub => `
                                                <li>
                                            ${sub.newspaper?.title || 'Unknown'} - ₹${sub.newspaper?.price?.toFixed(2) || '0.00'} 
                                            ${sub.count > 1 ? `<span class="subscription-count">x${sub.count}</span>` : ''}
                                            <span class="total-price">Total: ₹${(sub.newspaper?.price * sub.count).toFixed(2)}</span>
                                                    ${sub.isPaused ? '<span class="status-badge status-paused">Paused</span>' : ''}
                                                    ${sub.pauseDates && sub.pauseDates.length > 0 ? `
                                                        <p><strong>Paused Dates:</strong> 
                                                            ${sub.pauseDates.map(pause => `
                                                                <span class="paused-date">
                                                                    ${new Date(pause.startDate).toLocaleDateString()} - 
                                                                    ${new Date(pause.endDate).toLocaleDateString()}
                                                                </span>
                                                            `).join('')}
                                                        </p>
                                                    ` : ''}
                                            <p><strong>Delivery Status:</strong> 
                                                ${sub.deliveryHistory?.some(d =>
            d.date.getTime() === new Date().setHours(0, 0, 0, 0) &&
            d.completed
        ) ? '<span class="status-badge success">Delivered</span>' :
                '<span class="status-badge pending">Pending</span>'}
                                            </p>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
            <!-- All Customers -->
                    <div class="dashboard-section">
                        <h2 class="section-title">All Customers</h2>
                <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Subscriptions</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                <th>Mark as Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customers.map(customer => {
                    const customerSub = customerSubscriptions[customer._id.toString()] || {};
                    const subCount = customerSub.subscriptions?.length || 0;
                    const total = customerSub.totalAmount || 0;
                    const hasUnpaid = customerSub.subscriptions?.some(sub => !sub.paid) || false;
                    const allSubscriptions = customerSub.subscriptions || [];
                    return `
                                        <tr>
                                            <td>${customer.name}</td>
                                            <td>${customer.email}</td>
                                            <td>${customer.phone || 'Not provided'}</td>
                                            <td>${subCount}</td>
                                        <td>₹${total.toFixed(2)}</td>
                                            <td>
                                            <span class="status-badge ${hasUnpaid ? 'overdue' : subCount ? (customerSub.subscriptions?.some(sub => sub.paid === true) ? 'paid' : 'due') : 'inactive'}">
                                                ${hasUnpaid ? 'Overdue' : subCount ? (customerSub.subscriptions?.some(sub => sub.paid === true) ? 'Paid' : 'Due') : 'No Subs'}
                                                </span>
                                            ${hasUnpaid ? `
                                                <button class="send-message-btn" onclick="openMessageModal('${customer._id}', '${customer.name}')">
                                                    Send Message
                                                </button>
                                            ` : ''}
                                        </td>
                                        <td>
                                            <form action="/update-all-subscriptions-status" method="POST" style="display: inline;">
                                                <input type="hidden" name="userId" value="${customer._id}">
                                                <input type="hidden" name="subscriptionIds" value="${allSubscriptions.map(sub => sub._id).join(',')}">
                                                <input type="checkbox" name="paid" ${allSubscriptions.every(sub => sub.paid === true) ? 'checked' : ''} onchange="this.form.submit()">
                                            </form>
                                            </td>
                                        </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
                </div>
                    </div>
                    
            <!-- Delivery Person Statistics Section -->
            <div class="dashboard-section">
                <h2 class="section-title">Delivery Person Statistics</h2>
                <div class="delivery-stats-grid">
                    ${Object.values(deliveryStats).map(stat => `
                        <div class="delivery-stat-card">
                            <h3>${stat.name}</h3>
                            <p><strong>Email:</strong> ${stat.email}</p>
                            <p><strong>Phone:</strong> ${stat.phone || 'Not provided'}</p>
                            
                            <div class="delivery-stats">
                                <p><strong>Total Customers:</strong> <span class="stat-value">${stat.totalCustomers}</span></p>
                                <p><strong>Total Subscriptions:</strong> <span class="stat-value">${stat.totalSubscriptions}</span></p>
                                <p><strong>Total Amount:</strong> <span class="stat-value">₹${stat.totalAmount.toFixed(2)}</span></p>
                                <p><strong>Paused Deliveries:</strong> <span class="stat-value paused">${stat.pausedDeliveries}</span></p>
                </div>

                            <div class="customer-list">
                                <h4>Assigned Customers</h4>
                                ${stat.customers && stat.customers.length > 0 ? `
                                    <ul>
                                        ${stat.customers.map(customer => `
                                            <li>
                                                <strong>${customer.name}</strong>
                                                <p>Address: ${customer.address || 'Not provided'}</p>
                                                <p>Phone: ${customer.phone || 'Not provided'}</p>
                                                <p>Subscriptions: ${customer.subscriptionCount}</p>
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : '<p>No customers assigned yet</p>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        res.send(generateLayout('Manager Dashboard', content, user));
    } catch (err) {
        console.error('Error in manager dashboard:', err);
        res.status(500).send('Error loading dashboard');
    }
});

// Update Subscription Status Route
app.post('/update-subscription-status', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id, paid } = req.body;
        const subscription = await Subscription.findById(id);

        if (!subscription) {
            req.session.errorMessage = 'Subscription not found.';
            return res.redirect('/manager/dashboard');
        }

        // Update subscription status
        await Subscription.findByIdAndUpdate(id, {
            paid: paid === 'on',
            lastPaymentDate: paid === 'on' ? new Date() : null
        });

        // If marked as paid, delete all messages for this user from this manager
        if (paid === 'on') {
            const deletedMessages = await Message.deleteMany({
                to: subscription.user,
                from: req.session.user._id
            });

            req.session.successMessage = `Subscription marked as paid and ${deletedMessages.deletedCount} messages deleted.`;
        } else {
            req.session.successMessage = 'Subscription updated successfully.';
        }

        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Update status error:', err);
        req.session.errorMessage = 'Error updating subscription status.';
        res.redirect('/manager/dashboard');
    }
});

app.post('/assign-delivery-to-user', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId, deliveryPerson } = req.body;

        // If deliveryPerson is empty (unassign), set to null
        const deliveryPersonId = deliveryPerson === '' ? null : deliveryPerson;

        // Update all subscriptions for this user
        await Subscription.updateMany(
            { user: userId },
            { deliveryPerson: deliveryPersonId }
        );

        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Bulk delivery assignment error:', err);
        res.status(500).send('Error assigning delivery person to user subscriptions');
    }
});

// Send Reminder Route (fix for reminder functionality)
app.post('/send-reminder', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Implement your actual reminder logic here (email/SMS)
        console.log(`Payment reminder sent to ${user.email}`);
        // Example: await sendEmail(user.email, "Payment Reminder", "Please complete your payment");

        res.sendStatus(200);
    } catch (err) {
        console.error('Reminder error:', err);
        res.status(500).send('Error sending reminder');
    }
});

// Send Message Route
app.post('/send-message', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId, message } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            req.session.errorMessage = 'User not found';
            return res.redirect('/manager/dashboard');
        }

        // Create a new message
        const newMessage = new Message({
            from: req.session.user._id,
            to: userId,
            message: message
        });
        await newMessage.save();

        req.session.successMessage = 'Message sent successfully!';
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Message sending error:', err);
        req.session.errorMessage = 'Error sending message. Please try again.';
        res.redirect('/manager/dashboard');
    }
});

app.post('/edit-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id, title, price } = req.body;
        await Newspaper.findByIdAndUpdate(id, { title, price });
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Edit newspaper error:', err);
        res.status(500).send('Error editing newspaper');
    }
});

app.post('/delete-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id } = req.body;
        await Newspaper.findByIdAndDelete(id);
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Delete newspaper error:', err);
        res.status(500).send('Error deleting newspaper');
    }
});

app.post('/assign-delivery', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { subscriptionId, deliveryPerson } = req.body;

        // Get the subscription to find the user
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).send('Subscription not found');
        }

        // If deliveryPerson is empty (unassign), set to null
        const deliveryPersonId = deliveryPerson === '' ? null : deliveryPerson;

        // Update all subscriptions for this user
        await Subscription.updateMany(
            { user: subscription.user },
            { deliveryPerson: deliveryPersonId }
        );

        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Delivery assignment error:', err);
        res.status(500).send('Error assigning delivery person');
    }
});

// Delivery Dashboard
app.get('/delivery/dashboard', requireAuth, requireRole('delivery'), async (req, res) => {
    try {
        // Add no-cache headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const subs = await Subscription.find({ deliveryPerson: req.session.user._id })
            .populate({
                path: 'user',
                model: 'User',
                select: 'name address'
            })
            .populate({
                path: 'newspaper',
                model: 'Newspaper',
                select: 'title price'
            });

        // Group subscriptions by user
        const customerDeliveries = {};
        subs.forEach(sub => {
            if (!sub.user) return;
            const userId = sub.user._id.toString();
            if (!customerDeliveries[userId]) {
                customerDeliveries[userId] = {
                    user: sub.user,
                    subscriptions: [],
                    totalPrice: 0,
                    isPaused: false,
                    pauseDates: []
                };
            }
            customerDeliveries[userId].subscriptions.push(sub);
            customerDeliveries[userId].totalPrice += (sub.newspaper?.price || 0) * (sub.count || 1);
            if (sub.isPaused) {
                customerDeliveries[userId].isPaused = true;
                if (sub.pauseDates && sub.pauseDates.length > 0) {
                    customerDeliveries[userId].pauseDates = sub.pauseDates;
                }
            }
        });

        const content = `
                    <h1>Delivery Dashboard - ${req.session.user.name}</h1>
                    <div class="dashboard-section">
                        <h2>Assigned Deliveries</h2>
                ${Object.values(customerDeliveries).map(customer => `
                    <div class="subscription-item ${customer.isPaused ? 'paused' : ''}">
                        <h3>Customer: ${customer.user?.name || 'Not available'}</h3>
                        <p>Address: ${customer.user?.address || 'Not provided'}</p>
                        <p>Total Amount: ₹${customer.totalPrice.toFixed(2)}</p>
                        <p>Newspapers:</p>
                        <ul class="newspaper-list">
                            ${customer.subscriptions.map(sub => `
                                <li>
                                    ${sub.newspaper?.title || 'Not available'} - ₹${sub.newspaper?.price?.toFixed(2) || '0.00'}
                                    ${sub.count > 1 ? `<span class="subscription-count">x${sub.count}</span>` : ''}
                                    <form action="/mark-delivery-complete" method="POST" style="display: inline-block;">
                                        <input type="hidden" name="subscriptionId" value="${sub._id}">
                                        <button type="submit" class="btn btn-success" 
                                            ${sub.deliveryHistory?.some(d =>
            d.date.getTime() === new Date().setHours(0, 0, 0, 0) &&
            d.completed
        ) ? 'disabled' : ''}>
                                            ${sub.deliveryHistory?.some(d =>
            d.date.getTime() === new Date().setHours(0, 0, 0, 0) &&
            d.completed
        ) ? 'Delivered' : 'Mark as Delivered'}
                                        </button>
                                    </form>
                                </li>
                            `).join('')}
                        </ul>
                        ${customer.isPaused ? `
                                    <p class="paused-notice">Delivery Paused</p>
                            ${customer.pauseDates && customer.pauseDates.length > 0 ? `
                                <p>Paused from ${new Date(customer.pauseDates[0].startDate).toLocaleDateString()} 
                                to ${new Date(customer.pauseDates[0].endDate).toLocaleDateString()}</p>
                                    ` : ''}
                                ` : ''}
                            </div>
                        `).join('')}
                ${Object.keys(customerDeliveries).length === 0 ? '<p>No deliveries assigned yet</p>' : ''}
                    </div>
        `;
        res.send(generateLayout('Delivery Dashboard', content, req.session.user));
    } catch (err) {
        console.error('Delivery dashboard error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

app.get('/cleanup-subscriptions', async (req, res) => {
    const subscriptions = await Subscription.find()
        .populate('user')
        .populate('newspaper');

    const invalidSubs = subscriptions.filter(sub =>
        !sub.user || !sub.newspaper
    );

    await Subscription.deleteMany({
        _id: { $in: invalidSubs.map(sub => sub._id) }
    });

    res.send(`Removed ${invalidSubs.length} invalid subscriptions`);
});

// Subscription Routes
app.post('/subscribe', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.body.newspaper);
        if (!newspaper) {
            return res.status(404).send('Newspaper not found');
        }

        // Check if user already has a subscription for this newspaper
        const existingSubscription = await Subscription.findOne({
            user: req.session.user._id,
            newspaper: newspaper._id
        });

        if (existingSubscription) {
            // If subscription exists, update the count and total price
            existingSubscription.count = (existingSubscription.count || 1) + 1;
            existingSubscription.price = newspaper.price * existingSubscription.count;
            await existingSubscription.save();
        } else {
            // If no subscription exists, create a new one
            const sub = new Subscription({
                user: req.session.user._id,
                newspaper: newspaper._id,
                price: newspaper.price,
                paid: null,
                lastPaymentDate: null,
                count: 1,
                deliveryPerson: null,
                renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });
            await sub.save();
        }

        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).send('Error creating subscription');
    }
});

app.post('/cancel-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    await Subscription.findByIdAndDelete(req.body.id);
    res.redirect('/customer/dashboard');
});

app.post('/update-address', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { address } = req.body;
        await User.findByIdAndUpdate(req.session.user._id, { address });

        // Set success message in session
        req.session.successMessage = 'Address updated successfully!';
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Error updating address:', err);
        req.session.errorMessage = 'Error updating address. Please try again.';
        res.redirect('/customer/dashboard');
    }
});

app.post('/add-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { title, image, price } = req.body;
        const newspaper = new Newspaper({ title, image, price });
        await newspaper.save();
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Add newspaper error:', err);
        res.status(500).send('Error adding newspaper');
    }
});


app.post('/update-subscription', requireAuth, requireRole('manager'), async (req, res) => {
    const { id, deliveryPerson } = req.body;
    await Subscription.findByIdAndUpdate(id, { deliveryPerson });
    res.redirect('/manager/dashboard');
});

app.post('/delete-subscription', requireAuth, requireRole('manager'), async (req, res) => {
    await Subscription.findByIdAndDelete(req.body.id);
    res.redirect('/manager/dashboard');
});

// Update All Subscriptions Status Route
app.post('/update-all-subscriptions-status', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId, subscriptionIds, paid } = req.body;
        const subscriptionIdArray = subscriptionIds.split(',').filter(id => id);

        // Update subscription status
        await Subscription.updateMany(
            {
                _id: { $in: subscriptionIdArray },
                user: userId
            },
            {
                paid: paid === 'on',
                lastPaymentDate: paid === 'on' ? new Date() : null
            }
        );

        // If marked as paid, delete all messages for this user from this manager
        if (paid === 'on') {
            const deletedMessages = await Message.deleteMany({
                to: userId,
                from: req.session.user._id
            });

            // Set success message
            req.session.successMessage = `Subscriptions marked as paid and ${deletedMessages.deletedCount} messages deleted.`;
        } else {
            req.session.successMessage = 'Subscriptions updated successfully.';
        }

        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Update all subscriptions status error:', err);
        req.session.errorMessage = 'Error updating subscriptions status.';
        res.redirect('/manager/dashboard');
    }
});

app.get('/search-delivery-persons', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { area } = req.query;

        // Find delivery persons assigned to this area
        const deliveryPersons = await User.find({
            role: 'delivery',
            area: { $regex: area, $options: 'i' }
        }).select('name email phone area');

        // Get subscription counts for each delivery person in this area
        const deliveryStats = await Promise.all(deliveryPersons.map(async (dp) => {
            const subscriptions = await Subscription.find({
                deliveryPerson: dp._id
            }).populate('user');

            const subscriptionsInArea = subscriptions.filter(sub =>
                sub.user && sub.user.area &&
                sub.user.area.toLowerCase().includes(area.toLowerCase())
            );

            return {
                ...dp.toObject(),
                totalSubscriptions: subscriptionsInArea.length,
                totalCustomers: new Set(subscriptionsInArea.map(sub => sub.user._id.toString())).size,
                totalAmount: subscriptionsInArea.reduce((sum, sub) => sum + (sub.newspaper?.price || 0), 0)
            };
        }));

        res.json(deliveryStats);
    } catch (err) {
        console.error('Search delivery persons error:', err);
        res.status(500).json({ error: 'Error searching delivery persons' });
    }
});

app.post('/assign-delivery-to-area', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { deliveryPersonId, area } = req.body;

        // Find all users in the specified area
        const usersInArea = await User.find({ area });

        // Update all subscriptions for users in the area
        await Subscription.updateMany(
            { user: { $in: usersInArea.map(u => u._id) } },
            { deliveryPerson: deliveryPersonId }
        );

        res.sendStatus(200);
    } catch (err) {
        console.error('Area-based delivery assignment error:', err);
        res.status(500).send('Error assigning delivery person to area');
    }
});

// Add this new route for generating bills
app.get('/generate-bill/:userId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const subscriptions = await Subscription.find({ user: user._id })
            .populate('newspaper')
            .populate('deliveryPerson');

        const totalAmount = subscriptions.reduce((sum, sub) =>
            sum + ((sub.newspaper?.price || 0) * (sub.count || 1)), 0);

        const billDate = new Date().toLocaleDateString();
        const billNumber = `BILL-${Date.now()}`;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill - ${billNumber}</title>
                <style>
                    ${commonStyles}
                    /* Bill-specific styles */
                    @media print {
                        .no-print {
                            display: none;
                        }
                        body {
                            padding: 20px;
                            font-size: 12px;
                        }
                        .bill-container {
                            max-width: 100%;
                            margin: 0;
                            padding: 0;
                        }
                        .bill-header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .bill-details {
                            margin-bottom: 30px;
                        }
                        .bill-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .bill-table th,
                        .bill-table td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        .bill-table th {
                            background-color: #f5f5f5;
                        }
                        .bill-total {
                            text-align: right;
                            font-weight: bold;
                        }
                        .bill-footer {
                            margin-top: 50px;
                            text-align: center;
                            font-size: 10px;
                            color: #666;
                        }
                    }
                    .bill-container {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: white;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    .bill-header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid var(--primary);
                    }
                    .bill-header h1 {
                        color: var(--primary);
                        margin-bottom: 10px;
                    }
                    .bill-details {
                        margin-bottom: 30px;
                    }
                    .bill-details p {
                        margin: 5px 0;
                    }
                    .bill-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .bill-table th,
                    .bill-table td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    .bill-table th {
                        background-color: var(--primary);
                        color: white;
                    }
                    .bill-total {
                        text-align: right;
                        font-weight: bold;
                        font-size: 1.2em;
                    }
                    .bill-footer {
                        margin-top: 50px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    .print-btn {
                        display: inline-block;
                        padding: 10px 20px;
                        background: var(--primary);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="bill-container">
                    <div class="bill-header">
                        <h1>DAILY PULSE</h1>
                        <p>Newspaper Subscription Bill</p>
                    </div>
                    
                    <div class="bill-details">
                        <p><strong>Bill Number:</strong> ${billNumber}</p>
                        <p><strong>Date:</strong> ${billDate}</p>
                        <p><strong>Customer Name:</strong> ${user.name}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
                        <p><strong>Address:</strong> ${user.address || 'Not provided'}</p>
                    </div>

                    <table class="bill-table">
                        <thead>
                            <tr>
                                <th>Newspaper</th>
                                <th>Price</th>
                                <th>Count</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subscriptions.map(sub => `
                                <tr>
                                    <td>${sub.newspaper?.title || 'Unknown'}</td>
                                    <td>₹${sub.newspaper?.price?.toFixed(2) || '0.00'}</td>
                                    <td>${sub.count || 1}</td>
                                    <td>₹${((sub.newspaper?.price || 0) * (sub.count || 1)).toFixed(2)}</td>
                                    <td>${sub.paid ? 'Paid' : 'Unpaid'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="bill-total">Total Amount:</td>
                                <td class="bill-total">₹${totalAmount.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="bill-footer">
                        <p>Thank you for your subscription!</p>
                        <p>This is a computer-generated bill and does not require a signature.</p>
                    </div>

                    <div class="no-print" style="text-align: center;">
                        <button onclick="window.print()" class="print-btn">Print Bill</button>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Bill generation error:', err);
        res.status(500).send('Error generating bill');
    }
});

app.post('/mark-delivery-complete', requireAuth, requireRole('delivery'), async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            return res.status(404).send('Subscription not found');
        }

        // Check if delivery is already marked for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingDelivery = subscription.deliveryHistory.find(
            d => d.date.getTime() === today.getTime()
        );

        if (existingDelivery) {
            existingDelivery.completed = true;
            existingDelivery.completedAt = new Date();
            existingDelivery.completedBy = req.session.user._id;
        } else {
            subscription.deliveryHistory.push({
                date: today,
                completed: true,
                completedAt: new Date(),
                completedBy: req.session.user._id
            });
        }

        await subscription.save();
        res.redirect('/delivery/dashboard');
    } catch (err) {
        console.error('Mark delivery complete error:', err);
        res.status(500).send('Error marking delivery as complete');
    }
});

app.post('/renew-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { subscriptionId, autoRenew } = req.body;
        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            return res.status(404).send('Subscription not found');
        }

        // Update auto-renewal preference
        subscription.autoRenew = autoRenew === 'on';

        // If auto-renewing, extend the renewal date
        if (subscription.autoRenew) {
            subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        await subscription.save();
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Subscription renewal error:', err);
        res.status(500).send('Error updating subscription renewal');
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));