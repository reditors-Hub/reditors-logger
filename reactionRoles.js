'use strict';

// Reaction Role Map: emojiId → roleId
// Used by both the reaction add/remove handlers in index.js
const REACTION_ROLE_MAP = {
    // Editor Type
    '1553123692815327343': '1553201561310724197', // premiere_pro     → Premiere Pro
    '1553124129371328582': '1553239182288224336', // after_effects    → After Effects
    '1553124135826358292': '1553201565110902867', // davinci_resolve   → DaVinci Editor
    '1553467173089968158': '1553201569649131662', // capcut            → CapCut Editor
    // Device & Platform
    '1553459454983413870': '1553201574136782862', // windows          → PC
    '1553460435288727632': '1553460339201548398', // Apple            → MacOS
    '1553459723477459035': '1553201578406838372', // phone            → Mobile
};

// Message IDs that are reaction role messages (populated after deploy)
// These are stored here so the event handler can quickly filter
const REACTION_ROLE_MESSAGE_IDS = new Set();

module.exports = { REACTION_ROLE_MAP, REACTION_ROLE_MESSAGE_IDS };
