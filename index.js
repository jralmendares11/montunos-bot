require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ENV VARIABLES
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;

client.on("ready", () => {
    console.log(`Bot iniciado como ${client.user.tag}`);
});

// Comando simple para probar
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        return interaction.reply("pong 🦍");
    }
});

// Cuando el admin use /wlpass ID
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const guild = client.guilds.cache.get(GUILD_ID);

    if (interaction.commandName === "wlpass") {
        const userId = interaction.options.getString("id");

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.reply("No encontré ese usuario.");

        await member.roles.add(ROLE_WHITELIST);

        const log = guild.channels.cache.get(LOG_CHANNEL);
        if (log) log.send(`🟢 WHITELIST APROBADA → <@${userId}>`);

        return interaction.reply(`Se agregó whitelist a <@${userId}>`);
    }

    if (interaction.commandName === "wldenied") {
        const userId = interaction.options.getString("id");

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.reply("No encontré ese usuario.");

        await member.roles.add(ROLE_DENIED);

        const log = guild.channels.cache.get(LOG_CHANNEL);
        if (log) log.send(`🔴 WHITELIST DENEGADA → <@${userId}>`);

        return interaction.reply(`Se agregó WL DENEGADA a <@${userId}>`);
    }
});

client.login(TOKEN);
