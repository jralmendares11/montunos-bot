// ========== LÓGICA DE COMANDOS ==========
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);
    const userId = interaction.options.getString("id");

    // 1) Defer temprano: evita "Unknown interaction" por tarda más de 3s
    await interaction.deferReply({ ephemeral: true });

    // 2) Buscar al miembro
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      await interaction.editReply({
        content: "❌ No encontré ese usuario en el servidor."
      });
      return;
    }

    // ==== WL APROBADA ====
    if (interaction.commandName === "wlpass") {
      try {
        await member.roles.add(ROLE_WHITELIST);

        // LOG STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (log) {
          log.send(`🟢 <@${interaction.user.id}> aprobó una WL → <@${userId}>`)
            .catch(console.error);
        }

        // CANAL PÚBLICO + GIF
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴀsɪ́ sɪ́, Bienvenido Montuno. ғᴏʀᴍᴜʟᴀʀɪᴏ ʟɪᴍᴘɪᴏ. ᴀᴅᴇʟᴀɴᴛᴇ.**`,
            files: ["./assets/wlpass.gif"]
          }).catch(console.error);
        }

        // Responder al staff (edit porque ya hicimos deferReply)
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

    // ==== WL DENEGADA ====
    else if (interaction.commandName === "wldenied") {
      try {
        await member.roles.add(ROLE_DENIED);

        // LOG STAFF
        const log = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (log) {
          log.send(`🔴 <@${interaction.user.id}> denegó una WL → <@${userId}>`)
            .catch(console.error);
        }

        // CANAL PÚBLICO + GIF
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ᴠᴏʟᴠᴇʀ.**`,
            files: ["./assets/wldenied.gif"]
          }).catch(console.error);
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
    // Cualquier cosa que se escape llega aquí
    console.error("Error general en interactionCreate:", err);

    // Intentar avisar al staff sin volver a romper nada
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
