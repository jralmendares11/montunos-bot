require("dotenv").config();
const http = require("http");

// --- mini servidor para Render (para que no mate el bot) ---
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP keep-alive activo en el puerto ${PORT}`);
  });

// --- Discord Bot ---
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ENV VARIABLES
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;

// Cuando el bot se conecta
client.on("ready", () => {
  console.log(`🟢 Bot iniciado como ${client.user.tag}`);
});

// ==========================
//     COMANDOS DEL ADMIN
// ==========================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return interaction.reply("Error: Guild no encontrado.");

  // /wlpass id_usuario
  if (interaction.commandName === "wlpass") {
    const userId = interaction.options.getString("id");

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply("No encontré ese usuario.");

    await member.roles.add(ROLE_WHITELIST);

    const log = guild.channels.cache.get(LOG_CHANNEL);
    if (log) log.send(`🟢 **WHITELIST APROBADA** → <@${userId}>`);

    return interaction.reply(`✔️ Se agregó **WHITELIST** a <@${userId}>`);
  }

  // /wldenied id_usuario
  if (interaction.commandName === "wldenied") {
    const userId = interaction.options.getString("id");

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply("No encontré ese usuario.");

    await member.roles.add(ROLE_DENIED);

    const log = guild.channels.cache.get(LOG_CHANNEL);
    if (log) log.send(`🔴 **WHITELIST DENEGADA** → <@${userId}>`);

    return interaction.reply(`❌ Se agregó **WL DENEGADA** a <@${userId}>`);
  }
});

// LOGIN
client.login(TOKEN);
