require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// Servidor para keep-alive en Render
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP keep-alive activo en puerto ${PORT}`);
  });

// === BOT ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ENV
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;

// === REGISTRO AUTOMÁTICO DE SLASH COMMANDS ===
client.once("ready", async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("wlpass")
      .setDescription("Aprobar whitelist")
      .addStringOption(option =>
        option
          .setName("id")
          .setDescription("ID del usuario a aprobar")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("wldenied")
      .setDescription("Denegar whitelist")
      .addStringOption(option =>
        option
          .setName("id")
          .setDescription("ID del usuario a denegar")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Registrando comandos en Discord...");
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("Comandos registrados exitosamente ✔️");
  } catch (error) {
    console.error("Error registrando comandos:", error);
  }
});

// === LÓGICA DE LOS COMANDOS ===
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  const userId = interaction.options.getString("id");

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member)
    return interaction.reply("❌ No encontré ese usuario en el servidor.");

  // ============================
  //        WL APROBADA
  // ============================
  if (interaction.commandName === "wlpass") {
    await member.roles.add(ROLE_WHITELIST);

    const log = guild.channels.cache.get(LOG_CHANNEL);
    if (log)
      log.send(`🟢 *Whitelist aprobada* → <@${userId}>`);

    return interaction.reply(
      `:wlpass:  ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴀsɪ́ sɪ́, ᴄʜᴇʟᴇ. ғᴏʀᴍᴜʟᴀʀɪᴏ ʟɪᴍᴘɪᴏ. ᴀᴅᴇʟᴀɴᴛᴇ.**`
    );
  }

  // ============================
  //        WL DENEGADA
  // ============================
  if (interaction.commandName === "wldenied") {
    await member.roles.add(ROLE_DENIED);

    const log = guild.channels.cache.get(LOG_CHANNEL);
    if (log)
      log.send(`🔴 *Whitelist denegada* → <@${userId}>`);

    return interaction.reply(
      `:wldenied:  ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ᴀʟɢᴏ ғᴀʟʟᴏ́ ᴀʜɪ́. ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ǫᴜᴇ ᴠᴜᴇʟᴠᴀ ᴀ ʜᴀᴄᴇʀ ᴇʟ ɪɴᴛᴇɴᴛᴏ ᴀ ᴄɪᴇɢᴀs.**`
    );
  }
});

client.login(TOKEN);
