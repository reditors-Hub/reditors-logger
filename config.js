'use strict';
require('dotenv').config();

module.exports = {
    // Discord Authentication & Identifiers
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.CLIENT_ID || '1504235621152198666',
    guildId: process.env.GUILD_ID || '1497004973874085978',

    // URLs & Endpoints
    urls: {
        website: process.env.FRONTEND_URL || 'https://reditors.com',
        localServer: process.env.LOCAL_SERVER_URL || 'https://www.reditors.com',
        publicServer: process.env.PUBLIC_SERVER_URL || 'https://www.reditors.com',
        downloadWindows: 'https://github.com/REDitors/install-windows/releases/download/v1.0.11/REDitors-Setup-v1.0.11.exe',
        downloadMac: 'https://github.com/REDitors/install-mac/releases/download/REDitors-mac/REDitors-Setup-mac.pkg',
        downloadZxp: 'https://pub-d61d7d7e08e443edb8199d9fa7c2b69c.r2.dev/reditors-v1.2.6.zxp',
        invite: 'https://discord.com/invite/FqE4MGYPgt',
        logoUrl: 'https://reditors.com/Assets/Logo-512.png',
        bannerUrl: 'https://pub-b6a898edeb5744a3b040a255f99d74ce.r2.dev/reditors-banner.png'
    },

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || 'https://rnruqyeduwmgrpqttamw.supabase.co',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    },

    // Channels in Guild 1497004973874085978
    channels: {
        rules: '1497004974666678293',            // 📜・rules
        announcements: '1504240298446950400',    // 📢・announcement
        events: '1561619377327964292',           // 🎉・event
        levels: '1561619380977016892',           // 📈・levels
        banker: '1561619386245193758',           // 💵・banker
        giveaways: '1561619389982187610',        // 🎁・giveaways
        proof: '1561619393480229014',            // 📸・proof
        partnership: '1553501443913154600',      // ☑️・partnership
        aboutYou: '1561619405002113024',         // 🧩・about・you
        gamingRoles: '1561619412027572277',      // 🎯・gaming・roles
        customRoles: '1504240307888197652',      // 🎭・custom・roles
        welcome: '1561619272395005962',          // 🎉・welcome
        leftServer: '1553267179514765312',       // 👋・left・server
        invites: '1553237202983587921',          // ✉️・invites
        serverLog: '1561629172638687272',        // 📁 server-log
        memberLog: '1561629175004139692',        // 👤 member-log
        voiceLog: '1561629177055027270',         // 🎙️ voice-log
        messageLog: '1561629180632891393',       // 💬 message-log
        defaultLog: '1561628659461390367',       // 📑 default-log
        joinLeaveLog: '1561619498572709930',     // 🚪 join-leave-log
        changelog: '1504240300804145152',
        startHere: '1504240305543708813',
        pickYourRole: '1504240307888197652',
        latestRelease: '1504240345716621454',
        serverStats: '1504240367015297155',
        botLogs: '1504240363974692864',
        staffChat: '1504240361319563405',
        faq: '1504251410768724008',
        generalHelp: '1504240324405624902',
        autoCaptions: '1504240327509282948',
        silenceRemover: '1504240329962950880',
        speechCut: '1504240332240588880',
        titleAnimator: '1504240334408908811',
        bugReports: '1504240336829022208',
        featureRequests: '1504240339110596709',
        billingHelp: '1504240353924878436',
        licenseIssues: '1504240356428877935',
        viralCaptions: '1504251408294350899',
        joinLeft: '1553267179514765312',
        supportNotification: '1553264156117827655',
        waitingAdminVoice: '1553256667049631744',
        tapToCreateVoice: '1553285059883175999',
        tempVoiceCategory: '1553285752069165116',

        // ── ┌─[ Plugin log ]─┐ Category (1575039347072303186) ──
        pluginLogCategory: '1575039347072303186',
        logAutoCaptions:   '1575041662328115313', // 🎙️・auto-captions
        logSilenceRemover: '1575041667289981010', // ✂️・silence-remover
        logSpeechCut:      '1575041671790329957', // ⚡・speech-cut
        logTitleAnimator:  '1575041675737432064', // ✨・title-animator
        logViralCaptions:  '1575041679742869614', // 🔥・viral-captions
        logPluginSessions: '1575041683723255868', // 📱・plugin-sessions
        logAuthLogins:     '1575041687917428789', // 🔑・auth-logins
        logBillingCredits: '1575041692799860776', // 💳・billing-credits
        logDatabaseAudit:  '1575041697455280250', // 🗄️・database-audit
        logWebsiteVercel:  '1575041701440000071', // 🌐・website-vercel
        logServerErrors:   '1575041705139503106', // 🚨・server-errors
        logRailwayLive:    '1575041709417566374'  // 📋・railway-live-logs
    },

    // Roles in Guild 1497004973874085978
    roles: {
        // ── High Staff ──
        founder:         '1553201506671525938',
        coFounder:       '1553201510958239746',
        highStaff:       '1553234128969670686',
        // ── Staff Team ──
        staffTeam:       '1561646567575003238',
        trialStaff:      '1561647145268940810',
        enforcer:        '1561647552951091201',
        shielder:        '1561649303439548446',
        // ── Community ──
        elite:           '1555727037337960458',
        subscriberPro:   '1553201548580884552',
        vipMember:       '1553487037246480575',
        // ── Specialty / Reaction ──
        premiereEditor:  '1553201561310724197',
        davinciEditor:   '1553201565110902867',
        capcutEditor:    '1553201569649131662',
        pcEditor:        '1553201574136782862',
        mobileEditor:    '1553201578406838372',
        member:          '1553201582571786270'
    },

    // Brand Colors
    colors: {
        primary: 0x22c55e,     // REDitors Green (#22c55e)
        secondary: 0x5865f2,   // Discord Blurple (#5865f2)
        success: 0x10b981,     // Emerald (#10b981)
        danger: 0xef4444,      // Crimson Red (#ef4444)
        warning: 0xfbbf24,     // Amber Gold (#fbbf24)
        info: 0x3b82f6,        // Electric Blue (#3b82f6)
        purple: 0xa855f7,      // Purple (#a855f7)
        dark: 0x18181b         // Dark Zinc
    },

    // Current Plugin & Server Versions
    versions: {
        plugin: 'v1.2.6 Stable',
        server: 'v21.1.0 (PC Host)',
        minPremiere: 'Adobe Premiere Pro CC 2020+ (v14.2+)',
        platforms: 'Windows 10/11 & macOS (Intel & Apple Silicon M1/M2/M3/M4)'
    }
};
