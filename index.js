require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

// ----- ENV VARS -----
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ROLE_WHITELIST_ID = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED_ID = process.env.ROLE_DENIED_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ----- CLIENT -----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

// ----- SLASH COMMANDS -----
const commands = [
  new SlashCommandBuilder()
    .setName("wlpass")
    .setDescription("Marcar a un jugador como APROBADO en la whitelist")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName("usuario")
        .setDescription("Usuario a aprobar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("motivo")
        .setDescription("Motivo / notas (opcional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("wldenied")
    .setDescription("Marcar a un jugador como RECHAZADO en la whitelist")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName("usuario")
        .setDescription("Usuario a rechazar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("motivo")
        .setDescription("Motivo / notas (opcional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("wlcheck")
    .setDescription("Ver estado WL de un jugador (aprobado/denegado/ninguno)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName("usuario")
        .setDescription("Usuario a revisar")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

// ----- REGISTRAR COMANDOS -----
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("🟡 Registrando slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
}

// ----- HELPERS -----
function logAction(guild, content) {
  if (!LOG_CHANNEL_ID) return;
  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;
  channel.send(content).catch(() => {});
}

// ----- EVENTOS -----
client.once("ready", () => {
  console.log(`✅ Bot logueado como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (!interaction.guild) {
    return interaction.reply({
      content: "Este bot solo funciona dentro del servidor.",
      ephemeral: true,
    });
  }

  // Seguridad extra: solo gente con ManageRoles
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: "No tienes permisos para usar este comando.",
      ephemeral: true,
    });
  }

  try {
    if (commandName === "wlpass") {
      const user = interaction.options.getUser("usuario");
      const motivo = interaction.options.getString("motivo") || "Sin motivo";

      const member = await interaction.guild.members.fetch(user.id);

      // agregar / quitar roles
      if (ROLE_WHITELIST_ID) await member.roles.add(ROLE_WHITELIST_ID).catch(() => {});
      if (ROLE_DENIED_ID) await member.roles.remove(ROLE_DENIED_ID).catch(() => {});

      await interaction.reply({
        content: `✅ ${user} HA SIDO **APROBADO** en la whitelist.\n> Motivo: ${motivo}`,
      });

      logAction(
        interaction.guild,
        `✅ [WL PASS] ${interaction.user.tag} aprobó a ${user.tag} (${user.id})\nMotivo: ${motivo}`
      );
    }

    if (commandName === "wldenied") {
      const user = interaction.options.getUser("usuario");
      const motivo = interaction.options.getString("motivo") || "Sin motivo";

      const member = await interaction.guild.members.fetch(user.id);

      if (ROLE_DENIED_ID) await member.roles.add(ROLE_DENIED_ID).catch(() => {});
      if (ROLE_WHITELIST_ID) await member.roles.remove(ROLE_WHITELIST_ID).catch(() => {});

      await interaction.reply({
        content: `❌ ${user} HA SIDO **RECHAZADO** en la whitelist.\n> Motivo: ${motivo}`,
      });

      logAction(
        interaction.guild,
        `❌ [WL DENIED] ${interaction.user.tag} rechazó a ${user.tag} (${user.id})\nMotivo: ${motivo}`
      );
    }

    if (commandName === "wlcheck") {
      const user = interaction.options.getUser("usuario");
      const member = await interaction.guild.members.fetch(user.id);

      const tieneWL = ROLE_WHITELIST_ID
        ? member.roles.cache.has(ROLE_WHITELIST_ID)
        : false;
      const tieneDenied = ROLE_DENIED_ID
        ? member.roles.cache.has(ROLE_DENIED_ID)
        : false;

      let estado = "sin rol de WL asignado.";
      if (tieneWL) estado = "✅ APROBADO (tiene rol de whitelist).";
      if (tieneDenied) estado = "❌ RECHAZADO (tiene rol de whitelist denegada).";

      await interaction.reply({
        content: `ℹ️ Estado de ${user}: ${estado}`,
        ephemeral: true,
      });
    }
  } catch (err) {
    console.error("❌ Error en comando:", err);
    if (!interaction.replied) {
      interaction.reply({
        content: "Hubo un error ejecutando el comando.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// ----- INICIAR -----
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
