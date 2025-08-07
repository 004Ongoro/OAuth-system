const Client = require('../models/Client');
const User = require('../models/User');
const AuthorizationCode = require('../models/AuthorizationCode');
const argon2 = require('argon2');
const crypto = require('crypto');

const sessions = {};

// Helper to check for a valid session
function checkSession(req) {
    const sessionId = req.cookies.oauth_session;
    return sessionId && sessions[sessionId];
}

exports.authorize = async (req, res, next) => {
    const { response_type, client_id, redirect_uri, state } = req.query;

    if (response_type !== 'code') return res.status(400).render('error', { message: 'Unsupported response_type' });
    if (!client_id || !redirect_uri) return res.status(400).render('error', { message: 'Missing required parameters' });
    
    const client = await Client.findOne({ clientId: client_id });
    if (!client) return res.status(400).render('error', { message: 'Invalid client_id' });
    if (!client.redirectUris.includes(redirect_uri)) return res.status(400).render('error', { message: 'Invalid redirect_uri' });

    // Check if user is already logged in
    const userId = checkSession(req);
    if (userId) {
        // If logged in, skip login and go straight to consent
        req.session_user_id = userId;
        return exports.getConsentPage(req, res, next);
    }
    
    // If not logged in, show the login page
    const forwardQuery = new URLSearchParams(req.query).toString();
    res.redirect(`/oauth/login?${forwardQuery}`);
};

exports.getLoginPage = (req, res) => {
    res.render('login', { ...req.query, error: req.query.error || null });
};

exports.handleLogin = async (req, res, next) => {
    const { email, password, client_id, redirect_uri, response_type, state } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user && await argon2.verify(user.passwordHash, password)) {
            // Create a simple session
            const sessionId = crypto.randomBytes(32).toString('hex');
            sessions[sessionId] = user._id.toString();
            res.cookie('oauth_session', sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

            // On successful login, forward to consent page
            const client = await Client.findOne({ clientId: client_id });
            return res.render('consent', { client, redirect_uri, state });
        }
        
        // On failed login, redirect back to login page with an error
        const forwardQuery = new URLSearchParams({ client_id, redirect_uri, response_type, state, error: 'Invalid credentials' }).toString();
        res.redirect(`/oauth/login?${forwardQuery}`);

    } catch (err) {
        next(err);
    }
};

exports.getConsentPage = async (req, res, next) => {
    const { client_id, redirect_uri, state } = req.query;
    
    const client = await Client.findOne({ clientId: client_id });
    if (!client) return res.status(400).render('error', { message: 'Invalid client_id' });

    res.render('consent', { client, redirect_uri, state });
};

exports.handleConsent = async (req, res, next) => {
    const { action, client_id, redirect_uri, state } = req.body;
    const userId = checkSession(req);

    if (!userId) {
        return res.status(401).render('error', { message: 'You must be logged in to give consent.' });
    }
    
    const client = await Client.findOne({ clientId: client_id });
    if (!client) return res.status(400).render('error', { message: 'Invalid client_id' });

    if (action === 'deny') {
        const url = new URL(redirect_uri);
        url.searchParams.set('error', 'access_denied');
        if (state) url.searchParams.set('state', state);
        return res.redirect(url.toString());
    }

    if (action === 'allow') {
        const codeValue = crypto.randomBytes(32).toString('hex');
        const newCode = new AuthorizationCode({
            code: codeValue,
            user: userId,
            client: client._id,
            redirectUri: redirect_uri,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minute expiry
        });
        await newCode.save();

        const url = new URL(redirect_uri);
        url.searchParams.set('code', codeValue);
        if (state) url.searchParams.set('state', state);
        return res.redirect(url.toString());
    }
    
    res.status(400).render('error', { message: 'Invalid action.' });
};