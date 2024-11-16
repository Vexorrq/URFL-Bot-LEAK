const { Client, GatewayIntentBits, ActivityType, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

const app = express();
const port = 3000;

// Define status messages and other configurations
const statusMessages = ["Playing [WFL]Hub", "Playing [WFL]Hub"];
let currentIndex = 0;
const channelId = ''; // Define your channelId here

// Command options
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;
const REQUEST_CHANNEL_ID = process.env.REQUEST_CHANNEL_ID;
const ROLE_ID = process.env.ROLE_ID;
const SCOUT_CHANNEL_ID = process.env.SCOUT_CHANNEL_ID;
const FA_CHANNEL_ID = process.env.FA_CHANNEL_ID;
const FRIENDLY_CHANNEL_ID = process.env.FRIENDLY_CHANNEL_ID;

app.get('/', (req, res) => {
  res.send('YaY Your Bot Status Changed✨');
});

app.listen(port, () => {
  console.log(`🔗 Listening to RTX: http://localhost:${port}`);
  console.log(`🔗 Powered By RTX`);
});

async function login() {
  try {
    await client.login(TOKEN);
    console.log(`\x1b[36m%s\x1b[0m`, `|    🐇 Logged in as ${client.user.tag}`);
  } catch (error) {
    console.error('Failed to log in:', error);
    process.exit(1);
  }
}

function updateStatusAndSendMessages() {
  const currentStatus = statusMessages[currentIndex];
  client.user.setPresence({
    activities: [{ name: currentStatus, type: ActivityType.Custom }],
    status: 'dnd',
  });

  const textChannel = client.channels.cache.get(channelId);
  if (textChannel instanceof TextChannel) {
    textChannel.send(`Bot status is: ${currentStatus}`);
  }

  currentIndex = (currentIndex + 1) % statusMessages.length;
}

client.once('ready', () => {
  console.log(`\x1b[36m%s\x1b[0m`, `|    ✅ Bot is ready as ${client.user.tag}`);
  updateStatusAndSendMessages();
  setInterval(() => {
    updateStatusAndSendMessages();
  }, 10000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, member } = interaction;

  if (commandName === 'contract') {
    if (!ROLE_ID || !REQUEST_CHANNEL_ID) {
      return interaction.reply({ content: 'Configuration error. Please contact an admin.', ephemeral: true });
    }

    if (!member.roles.cache.has(ROLE_ID)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const user = options.getUser('user');
    const teamname = options.getString('teamname');
    const position = options.getString('position');
    const role = options.getString('role');
    const contractor = interaction.user;
    const contractId = Math.floor(Math.random() * 1000000);

    const embed = new EmbedBuilder()
      .setTitle('CONTRACT OFFER')
      .setDescription(`You have received a contract from ${teamname}!`)
      .addFields(
        { name: 'Contractor', value: contractor.tag },
        { name: 'Signee', value: user.tag },
        { name: 'Contract ID', value: contractId.toString() },
        { name: 'Team Name', value: teamname },
        { name: 'Position', value: position },
        { name: 'Role', value: role }
      );

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept')
          .setLabel('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('decline')
          .setLabel('❌')
          .setStyle(ButtonStyle.Danger)
      );

    try {
      await user.send({ embeds: [embed], components: [row] });
      interaction.reply({ content: 'Contract offer sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending DM:', error);
      return interaction.reply({ content: 'Failed to send the contract. Make sure the user can receive DMs from this server.', ephemeral: true });
    }

    const filter = i => i.customId === 'accept' || i.customId === 'decline';
    const collector = user.dmChannel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      try {
        if (i.customId === 'accept') {
          const channel = await client.channels.fetch(REQUEST_CHANNEL_ID);
          const acceptanceEmbed = new EmbedBuilder()
            .setTitle('CONTRACT ACCEPTED')
            .setDescription(`${user.tag} has accepted the contract!`)
            .addFields(
              { name: 'Team Name', value: teamname },
              { name: 'Position', value: position },
              { name: 'Role', value: role },
              { name: 'Contract ID', value: contractId.toString() }
            )
            .setFooter({ text: `Accepted by ${contractor.tag}` });

          await channel.send({ content: `<@${contractor.id}>`, embeds: [acceptanceEmbed] });
          await i.update({ content: 'You accepted the contract!', components: [] });
        } else {
          await i.update({ content: 'You declined the contract.', components: [] });
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        await i.update({ content: 'There was an error processing your response.', components: [] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        user.send('Contract response timed out.');
      }
    });
  } else if (commandName === 'scouting') {
    if (!SCOUT_CHANNEL_ID) {
      return interaction.reply({ content: 'Configuration error. Please contact an admin.', ephemeral: true });
    }

    const teamname = options.getString('teamname');
    const positions = options.getString('positions');
    const notes = options.getString('notes');
    const user = interaction.user;

    const embed = new EmbedBuilder()
      .setTitle('SCOUTING')
      .setDescription(`${teamname} is now scouting! Message ${user} if you think you fit into the description!`)
      .addFields(
        { name: 'Positions Needed', value: positions },
        { name: 'Notes', value: notes || 'N/A' }
      );

    try {
      const channel = await client.channels.fetch(SCOUT_CHANNEL_ID);
      await channel.send({ embeds: [embed] });
      interaction.reply({ content: 'Scouting announcement sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending scouting announcement:', error);
      interaction.reply({ content: 'Failed to send the scouting announcement. Please check the channel configuration.', ephemeral: true });
    }
  } else if (commandName === 'fa') {
    if (!FA_CHANNEL_ID) {
      return interaction.reply({ content: 'Configuration error. Please contact an admin.', ephemeral: true });
    }

    const username = options.getUser('username');
    const position = options.getString('position');
    const description = options.getString('description');

    const embed = new EmbedBuilder()
      .setTitle('FREE AGENT')
      .setDescription(`${username} has become a free agent!`)
      .addFields(
        { name: 'Position', value: position },
        { name: 'Description', value: description || 'No additional information' }
      );

    try {
      const channel = await client.channels.fetch(FA_CHANNEL_ID);
      await channel.send({ content: `<@${username.id}>`, embeds: [embed] });
      interaction.reply({ content: 'Free agent announcement sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending free agent announcement:', error);
      interaction.reply({ content: 'Failed to send the free agent announcement. Please check the channel configuration.', ephemeral: true });
    }
  } else if (commandName === 'friendly') {
    const requiredRoleID = '1270511446660223016'; // Role ID that is allowed to use the command
    const pingRoleID = '1270511446660223016'; // Role ID to be pinged in the announcement
    const friendlyChannelID = FRIENDLY_CHANNEL_ID;

    if (!interaction.member.roles.cache.has(requiredRoleID)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const teamname = options.getString('teamname');
    const info = options.getString('info');

    const embed = new EmbedBuilder()
      .setTitle('FRIENDLY MATCH')
      .setDescription(`A friendly match has been proposed by ${interaction.user.tag}!`)
      .addFields(
        { name: 'Team Name', value: teamname },
        { name: 'Details', value: info }
      );

    try {
      const channel = await client.channels.fetch(friendlyChannelID);
      await channel.send({ content: `<@&${pingRoleID}>`, embeds: [embed] });
      interaction.reply({ content: 'Friendly match proposal sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending friendly match proposal:', error);
      interaction.reply({ content: 'Failed to send the friendly match proposal. Please check the channel configuration.', ephemeral: true });
    }
  } else if (commandName === 'request') {
    const requestChannelID = REQUEST_CHANNEL_ID;
    const requestText = options.getString('text');

    if (!requestText) {
      return interaction.reply({ content: 'You must provide a request message.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('NEW REQUEST')
      .setDescription(requestText)
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    try {
      const channel = await client.channels.fetch(requestChannelID);
      await channel.send({ embeds: [embed] });
      interaction.reply({ content: 'Request sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending request:', error);
      interaction.reply({ content: 'Failed to send the request. Please check the channel configuration.', ephemeral: true });
    }
  } else if (commandName === 'recommend') {
    const recommendChannelID = '1269790617492525201'; // Define your channel ID here
    const userToRecommend = options.getUser('user');
    const robloxUser = options.getString('robloxuser');
    const reason = options.getString('reason');

    const embed = new EmbedBuilder()
      .setTitle('RECOMMENDATION')
      .setDescription(`A user has been recommended!`)
      .addFields(
        { name: 'Recommended User', value: userToRecommend.tag },
        { name: 'Roblox Username', value: robloxUser },
        { name: 'Reason', value: reason || 'No reason provided' }
      );

    const acceptButton = new ButtonBuilder()
      .setCustomId('recommend_accept')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId('recommend_reject')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

    try {
      const channel = await client.channels.fetch(recommendChannelID);
      await channel.send({ embeds: [embed], components: [row] });
      interaction.reply({ content: 'Recommendation sent!', ephemeral: true });
    } catch (error) {
      console.error('Error sending recommendation:', error);
      interaction.reply({ content: 'Failed to send the recommendation. Please check the channel configuration.', ephemeral: true });
    }
  }
});

async function registerCommands() {
  const commands = [
    {
      name: 'contract',
      description: 'Send a contract offer to a user',
      options: [
        {
          type: 6,
          name: 'user',
          description: 'The user to send the contract to',
          required: true
        },
        {
          type: 3,
          name: 'teamname',
          description: 'The name of the team',
          required: true
        },
        {
          type: 3,
          name: 'position',
          description: 'The position for the contract',
          required: true
        },
        {
          type: 3,
          name: 'role',
          description: 'The role for the contract',
          required: true
        }
      ]
    },
    {
      name: 'scouting',
      description: 'Announce a scouting request',
      options: [
        {
          type: 3,
          name: 'teamname',
          description: 'The name of the team scouting',
          required: true
        },
        {
          type: 3,
          name: 'positions',
          description: 'Positions needed',
          required: true
        },
        {
          type: 3,
          name: 'notes',
          description: 'Additional notes',
          required: false
        }
      ]
    },
    {
      name: 'fa',
      description: 'Announce a free agent',
      options: [
        {
          type: 6,
          name: 'username',
          description: 'The user who is a free agent',
          required: true
        },
        {
          type: 3,
          name: 'position',
          description: 'The position of the free agent',
          required: true
        },
        {
          type: 3,
          name: 'description',
          description: 'Additional description',
          required: false
        }
      ]
    },
    {
      name: 'friendly',
      description: 'Propose a friendly match',
      options: [
        {
          type: 3,
          name: 'teamname',
          description: 'The name of the team proposing the match',
          required: true
        },
        {
          type: 3,
          name: 'info',
          description: 'Additional information about the match',
          required: true
        }
      ]
    },
    {
      name: 'request',
      description: 'Send a request message',
      options: [
        {
          type: 3,
          name: 'text',
          description: 'The request message',
          required: true
        }
      ]
    },
    {
      name: 'recommend',
      description: 'Recommend a user',
      options: [
        {
          type: 6,
          name: 'user',
          description: 'The user to recommend',
          required: true
        },
        {
          type: 3,
          name: 'robloxuser',
          description: 'The Roblox username of the recommended user',
          required: true
        },
        {
          type: 3,
          name: 'reason',
          description: 'The reason for the recommendation',
          required: false
        }
      ]
    }
  ];

  const rest = new REST({ version: '9' }).setToken(TOKEN);
  
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
}

login().then(() => {
  registerCommands();
});