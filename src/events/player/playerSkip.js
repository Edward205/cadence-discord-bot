const logger = require('../../services/logger');
const { embedOptions, systemOptions, botOptions } = require('../../config');
const { EmbedBuilder } = require('discord.js');

// Emitted when the audio player fails to load the stream for a track
module.exports = {
    name: 'playerSkip',
    isDebug: false,
    isPlayerEvent: true,
    execute: async (queue, track) => {
        logger.error(`player.events.on('playerSkip'): Failed to play '${track.url}'.`);

        await queue.metadata.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `**${embedOptions.icons.error} Uh-oh... _Something_ went wrong!**\nIt seems there was an issue while loading stream for the track.\n\nIf you performed a command, you can try again.\n\n_If this problem persists, please submit a bug report in the **[support server](${botOptions.serverInviteUrl})**._`
                    )
                    .setColor(embedOptions.colors.error)
            ]
        });

        if (systemOptions.systemMessageChannelId && systemOptions.systemUserId) {
            await queue.metadata.client.channels.cache.get(systemOptions.systemMessageChannelId).send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `${embedOptions.icons.error} **player.events.on('playerSkip')**\n${track.url}` +
                                `\n\n<@${systemOptions.systemUserId}>`
                        )
                        .setColor(embedOptions.colors.error)
                ]
            });
        }

        process.env.NODE_ENV === 'development' ? logger.trace(queue, 'Queue object') : null;
    }
};
