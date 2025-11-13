require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    Routes 
} = require("discord.js");
const { REST } = require("@discordjs/rest");

// --------------------- CLIENT ---------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// --------------------- ENV ---------------------
const TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

// --------------------- SLASH COMMANDS ---------------------
const commands = [
    new SlashCommandBuilder()
        .setName("wlpass")
        .setDescription("Aprueba whitelist para un usuario por Discord ID")
        .addStringOption(option =>
            option.setName("id")
            .setDescription("El Discord ID del jugador")
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("wldenied")
        .setDescription("Deniega whitelist para un usuario por Discord ID")
        .addStringOption(option =>
            option.setName("id")
            .setDescription("El Discord ID del jugador")
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Prueba si el bot está vivo")
].map(cmd => cmd.toJSON());

// --------------------- REGISTRAR COMMANDS ---------------------
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log("Subiendo comandos slash...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✔️ Comandos registrados correctamente.");
    } catch (err) {
        console.error("Error al registrar comandos:", err);
    }
})();

// --------------------- BOT READY ---------------------
client.on("ready", () => {
    console.log(`Bot iniciado como ${client.user.tag}`);
});

// --------------------- COMANDOS ---------------------
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    const logChannel = guild.channels.cache.get(LOG_CHANNEL);

    // /ping
    if (interaction.commandName === "ping") {
        return interaction.reply("pong 🦍");
    }

    // /wlpass
    if (interaction.commandName === "wlpass") {
        const userId = interaction.options.getString("id");
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) return interaction.reply("❌ No encontré ese usuario en el servidor.");

        await member.roles.add(ROLE_WHITELIST);

        if (logChannel) logChannel.send(`🟢 **WHITELIST APROBADA** → <@${userId}>`);

        return interaction.reply(`✅ Se aprobó whitelist para <@${userId}>`);
    }

    // /wldenied
    if (interaction.commandName === "wldenied") {
        const userId = interaction.options.getString("id");
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) return interaction.reply("❌ No encontré ese usuario en el servidor.");

        await member.roles.add(ROLE_DENIED);

        if (logChannel) logChannel.send(`🔴 **WHITELIST DENEGADA** → <@${userId}>`);

        return interaction.reply(`❌ Se denegó whitelist para <@${userId}>`);
    }
});

client.login(TOKEN);
