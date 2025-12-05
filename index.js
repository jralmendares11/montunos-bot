// ================== CONFIG & IMPORTS ==================
require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// ================== KEEP ALIVE SERVER ==================
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP keep-alive activo en puerto ${PORT}`);
  });

// ================== BOT CLIENT ==================
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
const PUBLIC_CHANNEL = "1437181608485589012"; // Mensaje bonito + GIF
const LOG_CHANNEL    = "1064398910891765883"; // Mensaje simple staff

// ================== READY (UN SOLO READY) ==================
client.once("ready", async () => {
  console.log("=========== EVENTO READY ===========");
  console.log(`Bot iniciado como ${client.user.tag}`);
  console.log("DEBUG GUILD_ID:", GUILD_ID);
  console.log("DEBUG PUBLIC_CHANNEL:", PUBLIC_CHANNEL);

  // ================== REGISTRO DE SLASH COMMANDS ==================
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
    console.log("Intentando registrar comandos en GUILD:", GUILD_ID);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("✔️ Comandos registrados correctamente");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }

  console.log("=========== READY COMPLETADO ===========");
});

// ================== LÓGICA DE COMANDOS ==================
client.on("interactionCreate", async (interaction) => {
  // Log rápido para ver si esto se ejecuta
  console.log("Evento interactionCreate recibido:", interaction.commandName);

  if (!interaction.isChatInputCommand()) return;

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);
    const userId = interaction.options.getString("id");

    console.log("Comando recibido:", interaction.commandName, "para userId:", userId);

    // Defer temprano
    await interaction.deferReply({ ephemeral: true });

    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      console.log("No encontré al miembro con ID:", userId);
      await interaction.editReply({
        content: "❌ No encontré ese usuario en el servidor."
      });
      return;
    }

    // ========= WL APROBADA =========
    if (interaction.commandName === "wlpass") {
      try {
        console.log("Ejecutando /wlpass para:", userId);
        await member.roles.add(ROLE_WHITELIST);

        // LOG STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (log) {
          log.send(`🟢 <@${interaction.user.id}> aprobó una WL → <@${userId}>`)
            .catch(console.error);
        } else {
          console.error("No pude encontrar LOG_CHANNEL");
        }

        // CANAL PÚBLICO
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴀsɪ́ sɪ́, Bienvenido Montuno. ғᴏʀᴍᴜʟᴀʀɪᴏ ʟɪᴍᴘɪᴏ. ᴀᴅᴇʟᴀɴᴛᴇ.**`,
            files: ["./assets/wlpass.gif"]
          }).catch(console.error);
        } else {
          console.error("No pude encontrar PUBLIC_CHANNEL");
        }

        await interaction.editReply({
          content: "✔️ WL aprobada."
        });

      } catch (err) {
        console.error("Error en /wlpass:", err);
        await interaction.editReply({
          content: "❌ No pude asignar WL."
        }).catch(console.error);
      }
    }

    // ========= WL DENEGADA =========
    else if (interaction.commandName === "wldenied") {
      try {
        console.log("Ejecutando /wldenied para:", userId);
        await member.roles.add(ROLE_DENIED);

        // LOG STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (log) {
          log.send(`🔴 <@${interaction.user.id}> denegó una WL → <@${userId}>`)
            .catch(console.error);
        } else {
          console.error("No pude encontrar LOG_CHANNEL");
        }

        // CANAL PÚBLICO
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ᴠᴏʟᴠᴇʀ.**`,
            files: ["./assets/wldenied.gif"]
          }).catch(console.error);
        } else {
          console.error("No pude encontrar PUBLIC_CHANNEL");
        }

        await interaction.editReply({
          content: "❌ Denegado."
        });

      } catch (err) {
        console.error("Error en /wldenied:", err);
        await interaction.editReply({
          content: "❌ No pude asignar WL Denegada."
        }).catch(console.error);
      }
    }

  } catch (err) {
    console.error("Error general en interactionCreate:", err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "❌ Ocurrió un error al procesar el comando.",
        ephemeral: true
      }).catch(() => {});
    } else if (interaction.deferred) {
      interaction.editReply({
        content: "❌ Ocurrió un error al procesar el comando."
      }).catch(() => {});
    }
  }
});

// ================== LOGIN ==================
console.log("Iniciando login… TOKEN presente?", !!TOKEN);

client.login(TOKEN)
  .then(() => {
    console.log("✅ Login correcto, esperando evento 'ready'...");
  })
  .catch(err => {
    console.error("❌ Error en client.login:", err);
  });
