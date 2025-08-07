// controllers/oauthController.js (NEW AND IMPROVED)

const Client = require('../models/Client');
const User = require('../models/User');
const AuthorizationCode = require('../models/AuthorizationCode');
const argon2 = require('argon2');
const crypto = require('crypto');

exports.authorize = async (req, res, next) => {
    const { response_type, client_id, redirect_uri, state } = req.query;

    if (response_type !== 'code') return res.status(400).render('error', { message: 'Unsupported response_type' });
    if (!client_id || !redirect_uri) return res.status(400).render('error', { message: 'Missing required parameters' });

    const client = await Client.findOne({ clientId: client_id });
    if (!client) return res.status(400).render('error', { message: 'Invalid client_id' });
    if (!client.redirectUris.includes(redirect_uri)) return res.status(400).render('error', { message: 'Invalid redirect_uri' });

    req.session.oauth = {
        client_id,
        redirect_uri,
        state,
        // scope 
    };

    if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        return res.render('consent', { client, user });
    }

    res.render('login', { error: null });
};

exports.getLoginPage = (req, res) => {
    res.render('login', { error: req.query.error || null });
};

exports.handleLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Check if there's an active OAuth flow
        if (!req.session.oauth) {
            return res.status(400).render('error', { message: 'No active authorization request.' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.passwordHash) {
            return res.render('login', { error: 'Invalid credentials or sign-in method.' });
        }

        const passwordIsValid = await argon2.verify(user.passwordHash, password);
        if (passwordIsValid) {
            // Store user ID in the session to mark them as logged in
            req.session.userId = user._id;

            const client = await Client.findOne({ clientId: req.session.oauth.client_id });
            return res.render('consent', { client, user });
        }

        res.render('login', { error: 'Invalid credentials or sign-in method.' });

    } catch (err) {
        next(err);
    }
};

exports.handleConsent = async (req, res, next) => {
    try {
        const { action } = req.body;
        const { userId, oauth } = req.session;

        if (!userId || !oauth) {
            return res.status(400).render('error', { message: 'Session expired or invalid.' });
        }
        
        const client = await Client.findOne({ clientId: oauth.client_id });
        const redirectUrl = new URL(oauth.redirect_uri);
        if (oauth.state) redirectUrl.searchParams.set('state', oauth.state);

        // Clear the oauth transaction from the session
        req.session.oauth = null;

        if (action === 'deny') {
            redirectUrl.searchParams.set('error', 'access_denied');
            return res.redirect(redirectUrl.toString());
        }

        if (action === 'allow') {
            const codeValue = crypto.randomBytes(32).toString('hex');
            await AuthorizationCode.create({
                code: codeValue,
                user: userId,
                client: client._id,
                redirectUri: oauth.redirect_uri,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), 
            });

            redirectUrl.searchParams.set('code', codeValue);
            return res.redirect(redirectUrl.toString());
        }

        return res.status(400).render('error', { message: 'Invalid action.' });
    } catch (err) {
        next(err);
    }
};