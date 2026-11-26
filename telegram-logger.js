// ==============================================================================
// REDitors — Telegram Bot Real-Time Logger
// ==============================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
let cachedChatId = DEFAULT_CHAT_ID;
let lastUpdateId = 0;

let discord = null;
try { discord = require('./discord-logger'); } catch (_) {}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function discoverChatId() {
    if (cachedChatId) return cachedChatId;
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const update of data.result) {
                lastUpdateId = Math.max(lastUpdateId, update.update_id);
                const msg = update.message || update.channel_post;
                if (msg && msg.chat && msg.chat.id) {
                    cachedChatId = String(msg.chat.id);
                    return cachedChatId;
                }
            }
        }
    } catch (err) {}
    return cachedChatId;
}

async function sendMessage(htmlText, forceChatId = null) {
    const targetChatId = forceChatId || cachedChatId || (await discoverChatId());
    if (!targetChatId || !BOT_TOKEN) return false;
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: targetChatId, text: htmlText, parse_mode: 'HTML', disable_web_page_preview: true })
        });
        const data = await res.json();
        if (!data.ok) { console.warn('[telegram] sendMessage warning:', data.description); return false; }
        return true;
    } catch (err) {
        console.warn('[telegram] network error:', err.message);
        return false;
    }
}

async function logStripeEvent(eventType, data = {}) {
    try { if (discord && typeof discord.logBilling === 'function') discord.logBilling('stripe', eventType, data); } catch (_) {}
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    switch (eventType) {
        case 'checkout.session.started':
            return sendMessage(`🛒 <b>CHECKOUT STARTED</b>\n━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'Unknown')}</code>\n📦 <b>Plan:</b> <code>${escapeHTML(data.plan?.toUpperCase() || 'N/A')}</code> (${escapeHTML(data.interval || 'monthly')})\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'subscription.created':
        case 'checkout.session.completed':
            return sendMessage(`🟢 <b>NEW SUBSCRIPTION ACTIVATED!</b> 🎉\n━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'Unknown')}</code>\n💎 <b>Plan:</b> <b>${escapeHTML((data.plan || 'PRO').toUpperCase())}</b> (${escapeHTML(data.interval || 'monthly')})\n💵 <b>Amount:</b> <b>$${data.amount || '0.00'}</b>\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'invoice.paid':
            return sendMessage(`💰 <b>PAYMENT SUCCEEDED (RENEWAL)</b>\n━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'Customer')}</code>\n💵 <b>Amount:</b> <b>$${data.amount || '0.00'}</b>\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'invoice.payment_failed':
            return sendMessage(`🚨 <b>PAYMENT FAILED!</b> ⚠️\n━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'Unknown')}</code>\n⚠️ <b>Reason:</b> ${escapeHTML(data.reason || 'Card declined')}\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'customer.subscription.deleted':
            return sendMessage(`🔴 <b>SUBSCRIPTION CANCELLED</b>\n━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'Unknown')}</code>\n📦 <b>Former Plan:</b> <code>${escapeHTML((data.plan || 'pro').toUpperCase())}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
        default: return false;
    }
}

async function logPaddleEvent(eventType, data = {}) {
    try { if (discord && typeof discord.logBilling === 'function') discord.logBilling('paddle', eventType, data); } catch (_) {}
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    switch (eventType) {
        case 'subscription.created':
        case 'subscription.activated':
            return sendMessage(`🎉 <b>NEW PADDLE SUBSCRIPTION</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User ID:</b> <code>${escapeHTML(data.userId || 'N/A')}</code>\n📦 <b>Plan:</b> <code>${escapeHTML((data.plan || '').toUpperCase())}</code>\n💵 <b>Amount:</b> $${escapeHTML(String(data.amount || '0'))}\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'transaction.paid':
        case 'transaction.completed':
            return sendMessage(`💰 <b>PADDLE PAYMENT COMPLETED</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>Email:</b> <code>${escapeHTML(data.email || 'N/A')}</code>\n💵 <b>Amount:</b> $${escapeHTML(String(data.amount || '0'))}\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'subscription.canceled':
            return sendMessage(`🛑 <b>PADDLE SUBSCRIPTION CANCELED</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User ID:</b> <code>${escapeHTML(data.userId || 'N/A')}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
        default:
            return sendMessage(`💳 <b>PADDLE EVENT:</b> <code>${escapeHTML(eventType)}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
    }
}

async function logPolarEvent(eventType, data = {}) {
    try { if (discord && typeof discord.logBilling === 'function') discord.logBilling('polar', eventType, data); } catch (_) {}
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    switch (eventType) {
        case 'checkout.started':
            return sendMessage(`🛒 <b>POLAR CHECKOUT STARTED</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User ID:</b> <code>${escapeHTML(data.userId || 'N/A')}</code>\n📦 <b>Plan:</b> <code>${escapeHTML((data.plan || '').toUpperCase())}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'subscription.created':
        case 'subscription.active':
            return sendMessage(`🎉 <b>NEW POLAR SUBSCRIPTION</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User ID:</b> <code>${escapeHTML(data.userId || 'N/A')}</code>\n📦 <b>Plan:</b> <code>${escapeHTML((data.plan || '').toUpperCase())}</code>\n💵 <b>Amount:</b> $${escapeHTML(String(data.amount || '0'))}\n🕒 <b>Time:</b> <code>${time}</code>`);
        case 'subscription.canceled':
            return sendMessage(`🛑 <b>POLAR SUBSCRIPTION CANCELED</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>User ID:</b> <code>${escapeHTML(data.userId || 'N/A')}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
        default:
            return sendMessage(`⚡ <b>POLAR EVENT:</b> <code>${escapeHTML(eventType)}</code>\n🕒 <b>Time:</b> <code>${time}</code>`);
    }
}

async function logToolEvent(toolName, data = {}) {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    let icon = '✂️';
    if (toolName.toLowerCase().includes('caption') || toolName.toLowerCase().includes('transcribe')) icon = '🎙️';
    if (toolName.toLowerCase().includes('silence')) icon = '🔇';
    if (toolName.toLowerCase().includes('title')) icon = '🎨';
    let status = data.success !== false ? '✅ Completed' : '❌ Failed';
    let text = `${icon} <b>PLUGIN: ${escapeHTML(toolName.toUpperCase())}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n⚡ <b>Status:</b> ${status}\n👤 <b>User:</b> <code>${escapeHTML(data.email || data.userId || 'CEP Plugin')}</code>\n`;
    if (data.durationSec) text += `⏱️ <b>Audio Duration:</b> ${data.durationSec}s (~${(data.durationSec / 60).toFixed(1)} min)\n`;
    if (data.language) text += `🌐 <b>Language:</b> <code>${escapeHTML(data.language)}</code>\n`;
    if (data.error) text += `⚠️ <b>Error:</b> <code>${escapeHTML(data.error)}</code>\n`;
    text += `🕒 <b>Time:</b> <code>${time}</code>`;
    return sendMessage(text);
}

async function logServerBoot(version, port) {
    const time = new Date().toUTCString();
    return sendMessage(`🚀 <b>REDITORS SERVER DEPLOYED & LIVE</b>\n━━━━━━━━━━━━━━━━━━━━━━\n🏷️ <b>Version:</b> <code>v${escapeHTML(version)}</code>\n🌐 <b>Host:</b> <code>https://reditors.com</code>\n🔌 <b>Port:</b> <code>${port}</code>\n🛡️ <b>Environment:</b> <code>Production (Railway)</code>\n🕒 <b>Boot Time:</b> <code>${time}</code>`);
}

async function logError(title, err, req = null) {
    try { if (discord && typeof discord.logServerError === 'function') discord.logServerError(title, err, req); } catch (_) {}
    const time = new Date().toUTCString();
    let text = `🔥 <b>SERVER ERROR ALERT</b>\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ <b>Title:</b> <b>${escapeHTML(title)}</b>\n💥 <b>Message:</b> <code>${escapeHTML(err?.message || String(err))}</code>\n`;
    if (req) { text += `🌐 <b>Route:</b> <code>${req.method} ${escapeHTML(req.originalUrl || req.url)}</code>\n`; }
    text += `🕒 <b>Time:</b> <code>${time}</code>`;
    return sendMessage(text);
}

async function logUserEvent(eventType, data = {}) {
    try {
        if (discord) {
            if (eventType === 'plugin_session') discord.logPluginSession(data);
            else if (eventType === 'login' || eventType === 'signup') discord.logAuthLogin(eventType, data);
        }
    } catch (_) {}
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    let icon = '👤', title = 'USER EVENT';
    if (eventType === 'signup') { icon = '🎉'; title = 'NEW USER SIGNUP'; }
    if (eventType === 'login') { icon = '🔑'; title = 'USER LOGIN'; }
    if (eventType === 'plugin_session') { icon = '🎬'; title = 'PLUGIN LAUNCHED'; }
    let text = `${icon} <b>${title}</b>\n━━━━━━━━━━━━━━━━━━━━━\n👤 <b>Email:</b> <code>${escapeHTML(data.email || 'N/A')}</code>\n`;
    if (data.plan) text += `📦 <b>Plan:</b> <code>${escapeHTML(data.plan.toUpperCase())}</code>\n`;
    text += `🕒 <b>Time:</b> <code>${time}</code>`;
    return sendMessage(text);
}

async function logFraudAlert(type, severity, data = {}) {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    let text = `🚨 <b>FRAUD ALERT [${escapeHTML((severity || 'warning').toUpperCase())}]</b> ⚠️\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ <b>Type:</b> <code>${escapeHTML(type)}</code>\n`;
    if (data.ip) text += `🌐 <b>IP Address:</b> <code>${escapeHTML(data.ip)}</code>\n`;
    if (data.userId) text += `👤 <b>User ID:</b> <code>${escapeHTML(data.userId)}</code>\n`;
    text += `🕒 <b>Time:</b> <code>${time}</code>`;
    return sendMessage(text);
}

setTimeout(() => { discoverChatId().catch(() => {}); }, 3000);

module.exports = { discoverChatId, sendMessage, logStripeEvent, logPaddleEvent, logPolarEvent, logToolEvent, logUserEvent, logFraudAlert, logServerBoot, logError };
