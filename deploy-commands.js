require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('wlpass')
        .setDescription('Aprobar whitelist de un usuario')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario a aprobar')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('wldenied')
        .setDescription('Denegar whitelist de un usuario')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario a denegar')
                .setRequired(true)
        )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🚀 Registrando comandos...');

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Comandos registrados correctamente!');
    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
})();
