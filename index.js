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

// ========== MANEJO GLOBAL DE ERRORES ==========
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

// ========== SERVIDOR KEEP-ALIVE (RENDER) ==========
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
const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;        // canal STAFF (usar comando + logs)
const RESULT_CHANNEL = process.env.RESULT_CHANNEL_ID;  // canal PÚBLICO (mensaje bonito)

// ========== REGISTRO DE SLASH COMMANDS ==========
client.once("ready", async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("wlpass")
      .setDescription("Aprobar whitelist")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("ID del usuario")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("wldenied")
      .setDescription("Denegar whitelist")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("ID del usuario")
          .setRequired(true)
      )
  ].map((cmd) => cmd.toJSON());

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
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);

    if (!guild) {
      console.error("No se encontró guild. Revisar GUILD_ID / invitación del bot.");
      return interaction.reply({
        content:
          "❌ Hay un problema de configuración con el servidor (GUILD_ID). Avisá a la administración.",
        ephemeral: true
      });
    }

    const userId = interaction.options.getString("id");
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: "❌ No encontré ese usuario en el servidor.",
        ephemeral: true
      });
    }

    // ===== WL APROBADA =====
    if (interaction.commandName === "wlpass") {
      try {
        // Solo permitir el comando en el canal de staff
        if (LOG_CHANNEL && interaction.channelId !== LOG_CHANNEL) {
          return interaction.reply({
            content: "❌ Este comando solo se puede usar en el canal de staff.",
            ephemeral: true
          });
        }

        await member.roles.add(ROLE_WHITELIST);

        // LOG PARA STAFF (mensaje simple)
        if (LOG_CHANNEL) {
          try {
            const logChannel = await guild.channels.fetch(LOG_CHANNEL);
            if (
              logChannel &&
              (logChannel.type === ChannelType.GuildText ||
                logChannel.isTextBased?.())
            ) {
              await logChannel.send(`🟢 WHITELIST APROBADA → <@${userId}>`);
            }
          } catch (err) {
            console.error("Error enviando log de WL aprobada:", err);
          }
        }

        // MENSAJE BONITO EN CANAL PÚBLICO (RESULT_CHANNEL)
        if (RESULT_CHANNEL) {
          try {
            const publicChannel = await guild.channels.fetch(RESULT_CHANNEL);
            if (
              publicChannel &&
              (publicChannel.type === ChannelType.GuildText ||
                publicChannel.isTextBased?.())
            ) {
              await publicChannel.send(
                `ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴀsɪ́ sɪ́, Bienvenido Montuno. ғᴏʀᴍᴜʟᴀʀɪᴏ ʟɪᴍᴘɪᴏ. ᴀᴅᴇʟᴀɴᴛᴇ.** <a:wlpass:1438759548872818738>`
              );
            }
          } catch (err) {
            console.error("Error enviando mensaje público WL aprobada:", err);
          }
        }

        // RESPUESTA SOLO PARA QUIEN USÓ EL COMANDO
        return interaction.reply({
          content: `✔️ Aprobaste a <@${userId}> y se anunció en resultados.`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Error en /wlpass:", err);
        return interaction.reply({
          content:
            "❌ No pude asignar el rol WL. Revisá los permisos y que el bot esté arriba del rol.",
          ephemeral: true
        });
      }
    }

    // ===== WL DENEGADA =====
    if (interaction.commandName === "wldenied") {
      try {
        // Solo permitir el comando en el canal de staff
        if (LOG_CHANNEL && interaction.channelId !== LOG_CHANNEL) {
          return interaction.reply({
            content: "❌ Este comando solo se puede usar en el canal de staff.",
            ephemeral: true
          });
        }

        await member.roles.add(ROLE_DENIED);

        // LOG PARA STAFF (mensaje simple)
        if (LOG_CHANNEL) {
          try {
            const logChannel = await guild.channels.fetch(LOG_CHANNEL);
            if (
              logChannel &&
              (logChannel.type === ChannelType.GuildText ||
                logChannel.isTextBased?.())
            ) {
              await logChannel.send(`🔴 WHITELIST DENEGADA → <@${userId}>`);
            }
          } catch (err) {
            console.error("Error enviando log de WL denegada:", err);
          }
        }

        // MENSAJE BONITO EN CANAL PÚBLICO
        if (RESULT_CHANNEL) {
          try {
            const publicChannel = await guild.channels.fetch(RESULT_CHANNEL);
            if (
              publicChannel &&
              (publicChannel.type === ChannelType.GuildText ||
                publicChannel.isTextBased?.())
            ) {
              await publicChannel.send(
                `ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ᴀʟɢᴏ ғᴀʟʟᴏ́ ᴀʜɪ́. ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ǫᴜᴇ ᴠᴜᴇʟᴠᴀ ᴀ ʜᴀᴄᴇʀ ᴇʟ ɪɴᴛᴇɴᴛᴏ ᴀ ᴄɪᴇɢᴀs.** <a:wldenied:1438762143561289728>`
              );
            }
          } catch (err) {
            console.error("Error enviando mensaje público WL denegada:", err);
          }
        }

        // RESPUESTA SOLO PARA STAFF
        return interaction.reply({
          content: `❌ Denegaste a <@${userId}> y se anunció en resultados.`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Error en /wldenied:", err);
        return interaction.reply({
          content:
            "❌ No pude asignar el rol WL Denegada. Revisá los permisos y jerarquía del bot.",
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error("Error general manejando interacción:", error);

    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp({
          content:
            "❌ Ocurrió un error inesperado procesando el comando. Avisá a la administración.",
          ephemeral: true
        })
        .catch(() => {});
    } else {
      await interaction
        .reply({
          content:
            "❌ Ocurrió un error inesperado procesando el comando. Avisá a la administración.",
          ephemeral: true
        })
        .catch(() => {});
    }
  }
});

client.login(TOKEN);
