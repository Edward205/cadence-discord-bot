import config from 'config';
import { GuildQueue, Track } from 'discord-player';
import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    EmbedAuthorOptions,
    GuildMember,
    Interaction,
    Message,
    MessageComponentInteraction,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { Logger } from 'pino';
import loggerModule from '../services/logger';
import { BotOptions, EmbedOptions } from '../types/configTypes';
import {
    BaseAutocompleteParams,
    BaseAutocompleteReturnType,
    BaseComponentParams,
    BaseComponentReturnType,
    BaseInteractionParams,
    BaseSlashCommandParams,
    BaseSlashCommandReturnType
} from '../types/interactionTypes';
import { Validator, ValidatorParams } from '../types/utilTypes';

abstract class BaseInteraction {
    embedOptions: EmbedOptions;
    botOptions: BotOptions;

    constructor() {
        this.embedOptions = config.get('embedOptions');
        this.botOptions = config.get('botOptions');
    }

    protected getLoggerBase(
        module: string,
        name: string,
        executionId: string,
        interaction: Interaction | MessageComponentInteraction
    ): Logger {
        return loggerModule.child({
            module: module,
            name: name,
            executionId: executionId,
            shardId: interaction.guild?.shardId,
            guildId: interaction.guild?.id
        });
    }

    protected validators: Validator[] = [];

    protected async runValidators(args: ValidatorParams, validators?: Validator[]): Promise<void> {
        for (const validator of validators ? validators : this.validators) {
            await validator(args);
        }
    }

    protected getFormattedDuration(track: Track): string {
        let durationFormat =
            Number(track.raw.duration) === 0 || track.duration === '0:00' ? '' : `**\`${track.duration}\`**`;

        if (track.raw.live) {
            durationFormat = `**${this.embedOptions.icons.liveTrack} \`LIVE\`**`;
        }

        return durationFormat;
    }

    protected getFormattedTrackUrl(track: Track): string {
        const trackTitle = track.title ?? 'Title unavailable';
        const trackUrl = track.url ?? track.raw.url;
        if (!trackTitle || !trackUrl) {
            return '**Unavailable**';
        }
        return `**[${trackTitle}](${trackUrl})**`;
    }

    protected getDisplayTrackDurationAndUrl(track: Track): string {
        const formattedDuration = this.getFormattedDuration(track);
        const formattedUrl = this.getFormattedTrackUrl(track);

        return `${formattedDuration} ${formattedUrl}`;
    }

    abstract execute(
        params: BaseInteractionParams
    ): Promise<Message<boolean> | ApplicationCommandOptionChoiceData | void>;
}

abstract class BaseInteractionWithEmbedResponse extends BaseInteraction {
    constructor() {
        super();
    }

    protected async getEmbedUserAuthor(
        interaction: MessageComponentInteraction | ChatInputCommandInteraction
    ): Promise<EmbedAuthorOptions> {
        let authorName: string = '';
        if (interaction.member instanceof GuildMember) {
            authorName = interaction.member.nickname || interaction.user.username;
        } else {
            authorName = interaction.user.username;
        }

        return {
            name: authorName,
            iconURL: interaction.user.avatarURL() || this.embedOptions.info.fallbackIconUrl
        };
    }

    protected async getEmbedQueueAuthor(
        interaction: MessageComponentInteraction | ChatInputCommandInteraction,
        queue: GuildQueue
    ): Promise<EmbedAuthorOptions> {
        return {
            name: `Channel: ${queue.channel!.name} (${queue.channel!.bitrate / 1000}kbps)`,
            iconURL: interaction.guild!.iconURL() || this.embedOptions.info.fallbackIconUrl
        };
    }
}

export abstract class BaseSlashCommandInteraction extends BaseInteractionWithEmbedResponse {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder;
    isSystemCommand: boolean;
    isNew: boolean;
    isBeta: boolean;
    name: string;

    constructor(
        data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder,
        isSystemCommand: boolean = false,
        isNew: boolean = false,
        isBeta: boolean = false
    ) {
        super();
        this.data = data.setDMPermission(false).setNSFW(false);
        this.isSystemCommand = isSystemCommand;
        this.isNew = isNew;
        this.isBeta = isBeta;
        this.name = data.name;
    }

    protected getLogger(name: string, executionId: string, interaction: ChatInputCommandInteraction): Logger {
        return super.getLoggerBase('slashCommandInteraction', name, executionId, interaction);
    }

    abstract execute(params: BaseSlashCommandParams): BaseSlashCommandReturnType;
}

export abstract class BaseComponentInteraction extends BaseInteractionWithEmbedResponse {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    protected getLogger(name: string, executionId: string, interaction: MessageComponentInteraction): Logger {
        return super.getLoggerBase('componentInteraction', name, executionId, interaction);
    }

    abstract execute(params: BaseComponentParams): BaseComponentReturnType;
}

export abstract class BaseAutocompleteInteraction extends BaseInteraction {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    protected getLogger(name: string, executionId: string, interaction: AutocompleteInteraction): Logger {
        return super.getLoggerBase('autocompleteInteraction', name, executionId, interaction);
    }

    abstract execute(params: BaseAutocompleteParams): BaseAutocompleteReturnType;
}

export class CustomError extends Error {
    type?: string;
    code?: string;
}

export class InteractionValidationError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'InteractionValidationError';
    }
}
