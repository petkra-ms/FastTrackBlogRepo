/**
 * auth.js
 * Hardcoded demo users and session management (sessionStorage).
 */

const USERS = [
    { id: 'ci-contact-001', name: 'John Smith',  email: 'john.smith@demo.com',   password: 'Demo1234!' },
    { id: 'ci-contact-002', name: 'Sarah Jones', email: 'sarah.jones@demo.com',  password: 'Demo1234!' },
    { id: 'ci-contact-003', name: 'Guest User',  email: 'guest@demo.com',        password: 'Demo1234!' }
];

const SESSION_KEY = 'wsDemo_user';

/** Attempt login; returns user object or null. */
function login(email, password) {
    const user = USERS.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (user) {
        const session = { id: user.id, name: user.name, email: user.email };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }
    return null;
}

/** Return current session user or null. */
function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
}

/** Clear session and redirect to login page. */
function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('wsDemo_cart');
    window.location.href = 'index.html';
}

/**
 * Call at the top of protected pages.
 * Redirects to index.html if no valid session exists.
 */
function requireSession() {
    if (!getSession()) {
        window.location.href = 'index.html';
    }
}
