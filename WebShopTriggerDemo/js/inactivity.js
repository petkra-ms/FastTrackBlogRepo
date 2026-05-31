/**
 * inactivity.js
 * Detects 5 minutes of user inactivity and fires the abandoned cart trigger.
 *
 * - Activity events (mousemove, keydown, click, scroll, touchstart) reset the timer.
 * - A countdown toast appears in the final 60 seconds.
 * - The trigger only fires if the cart is non-empty and a user is logged in.
 * - After firing, the timer resets (won't fire again until next inactivity period).
 */

const INACTIVITY_TIMEOUT_MS = 0.5 * 60 * 1000;   // 1 minutes
const COUNTDOWN_START_MS    = 20 * 1000;        // show toast in last 20 s
const TICK_INTERVAL_MS      = 1000;             // update toast every second

let inactivityTimer    = null;
let countdownTimer     = null;
let countdownSeconds   = 0;
let triggerFired       = false;

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

function initInactivityDetection() {
    ACTIVITY_EVENTS.forEach(event =>
        document.addEventListener(event, resetInactivityTimer, { passive: true })
    );
    startInactivityTimer();
}

function startInactivityTimer() {
    clearTimers();
    triggerFired = false;
    hideToast();

    // Schedule countdown toast
    const countdownDelay = INACTIVITY_TIMEOUT_MS - COUNTDOWN_START_MS;
    inactivityTimer = setTimeout(() => {
        startCountdown();
    }, countdownDelay);
}

function resetInactivityTimer() {
    if (triggerFired) return;   // don't reset after firing until next explicit reset
    startInactivityTimer();
}

function startCountdown() {
    countdownSeconds = COUNTDOWN_START_MS / 1000;
    showToast(countdownSeconds);

    countdownTimer = setInterval(() => {
        countdownSeconds--;
        if (countdownSeconds <= 0) {
            clearInterval(countdownTimer);
            fireTrigger();
        } else {
            updateToastCountdown(countdownSeconds);
        }
    }, TICK_INTERVAL_MS);
}

function fireTrigger() {
    triggerFired = true;
    hideToast();

    const user = getSession ? getSession() : null;
    const cart = typeof getCart === 'function' ? getCart() : [];

    if (!user || cart.length === 0) {
        console.log('[CI Journeys] Trigger skipped – no user or empty cart.');
        return;
    }

    triggerAbandonedCart(user, cart);

    // Show fired notification
    showFiredToast();

    // Allow re-triggering after another full inactivity period
    setTimeout(() => {
        triggerFired = false;
        hideFiredToast();
        startInactivityTimer();
    }, 10000);
}

function clearTimers() {
    clearTimeout(inactivityTimer);
    clearInterval(countdownTimer);
}

// ── Toast helpers ────────────────────────────────────────────────────────────

function getOrCreateToast() {
    let toast = document.getElementById('inactivity-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'inactivity-toast';
        toast.className = 'inactivity-toast';
        document.body.appendChild(toast);
    }
    return toast;
}

function showToast(seconds) {
    const toast = getOrCreateToast();
    toast.innerHTML = `
        <span class="toast-icon">🛒</span>
        <span class="toast-msg">Cart reminder in <strong id="toast-countdown">${seconds}</strong>s…</span>
        <button class="toast-dismiss" onclick="resetInactivityTimer()">Stay</button>
    `;
    toast.classList.add('visible');
}

function updateToastCountdown(seconds) {
    const el = document.getElementById('toast-countdown');
    if (el) el.textContent = seconds;
}

function hideToast() {
    const toast = document.getElementById('inactivity-toast');
    if (toast) toast.classList.remove('visible');
}

function showFiredToast() {
    const toast = getOrCreateToast();
    toast.innerHTML = `
        <span class="toast-icon">✅</span>
        <span class="toast-msg">Abandoned cart reminder sent! (check console)</span>
    `;
    toast.classList.add('visible', 'toast-fired');
}

function hideFiredToast() {
    const toast = document.getElementById('inactivity-toast');
    if (toast) {
        toast.classList.remove('visible', 'toast-fired');
    }
}
