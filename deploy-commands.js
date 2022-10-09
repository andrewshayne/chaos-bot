const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('wreakhavoc').setDescription('Begin nonsense')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Determines what sounds will be made (defaults to "Standard").')
                .setRequired(false)
                .addChoices(
                    { name: 'Standard (Mix of goofy noises)', value: '_standard' },
                    { name: 'Vine Boom', value: '_vine_boom' },
                    { name: 'Metal Pipe', value: '_metal_pipe' },
                    { name: 'Dank (Warning: Loud Volume)', value: '_dank' },
                    { name: 'Vinny', value: '_vinny' },
                    { name: 'Donkey Kong', value: '_dkc' },
                )
        )
        .addStringOption(option =>
            option.setName('frequency')
                .setDescription('Determines how often sounds are made (defaults to "Moderate").')
                .setRequired(false)
                .addChoices(
                    { name: 'Low', value: '_low' },
                    { name: 'Moderate', value: '_moderate' },
                    { name: 'High', value: '_high' },
                    { name: 'I can\'t hear my own thoughts', value: '_spam' },
                )
        ),
    new SlashCommandBuilder().setName('endhavoc').setDescription('Halt nonsense')
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);
