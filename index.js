require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

// ========== KEEP ALIVE SERVER ==========
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP keep-alive activo en puerto ${PORT}`);
  });

// ========== BOT ==========
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ENV
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// ROLES
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;

// CANALES
const PUBLIC_CHANNEL = "1437181608485589012"; // Aquí va el mensaje bonito + GIF
const LOG_CHANNEL = "1064398910891765883";   // Aquí va el mensaje simple del staff

// ========== REGISTRO DE SLASH COMMANDS ==========
client.once("ready", async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("wlpass")
      .setDescription("Aprobar whitelist")
      .addStringOption(option =>
        option.setName("id").setDescription("ID del usuario").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("wldenied")
      .setDescription("Denegar whitelist")
      .addStringOption(option =>
        option.setName("id").setDescription("ID del usuario").setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Registrando comandos...");
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands
    });
    console.log("✔️ Comandos registrados");
  } catch (error) {
    console.error("Error registrando comandos:", error);
  }
});

// ========== LÓGICA DE COMANDOS ==========
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);
    const userId = interaction.options.getString("id");
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member)
      return interaction.reply({
        content: "❌ No encontré ese usuario en el servidor.",
        ephemeral: true
      });

    // ==== WL APROBADA ====
    if (interaction.commandName === "wlpass") {
      try {
        await member.roles.add(ROLE_WHITELIST);

        // LOG PARA STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL);
        if (log) log.send(`🟢 WL APROBADA → <@${userId}>`);

        // MENSAJE BONITO CON GIF
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL);
        if (publicChannel) {
          await publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴇsᴏᴏᴏᴏᴏ, Bienvenido Montuno. ᴀᴅᴇʟᴀɴᴛᴇ.**`,
            files: ["./assets/wlpass.gif"]
          });
        }

      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: "❌ No pude asignar WL.",
          ephemeral: true
        });
      }
    }

    // ==== WL DENEGADA ====
    if (interaction.commandName === "wldenied") {
      try {
        await member.roles.add(ROLE_DENIED);

        // LOG STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL);
        if (log) log.send(`🔴 WL DENEGADA → <@${userId}>`);

        // MENSAJE CON GIF
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL);
        if (publicChannel) {
          await publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ᴠᴏʟᴠᴇʀ.**`,
            files: ["./assets/wldenied.gif"]
          });
        }

        return interaction.reply({
          content: `❌ Denegado.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: "❌ No pude asignar WL Denegada.",
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
});

client.login(TOKEN);
