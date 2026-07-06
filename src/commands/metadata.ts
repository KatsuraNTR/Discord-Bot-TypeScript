import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { Args } from './index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export const ChatCommandMetadata: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = {
    DEV: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.dev', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.dev'),
        description: Lang.getRef('commandDescs.dev', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.dev'),
        dm_permission: true,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
        ]).toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('devSubcommands.info', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devSubcommands.info'),
                description: Lang.getRef('devSubcommandDescs.info', Language.Default),
                description_localizations: Lang.getRefLocalizationMap('devSubcommandDescs.info'),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('devSubcommands.presenceSet', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devSubcommands.presenceSet'),
                description: Lang.getRef('devSubcommandDescs.presenceSet', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'devSubcommandDescs.presenceSet'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.activityType', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.activityType'),
                        description: Lang.getRef('argDescs.presenceActivityType', Language.Default),
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.presenceActivityType'
                        ),
                        required: true,
                        choices: [
                            { name: 'Playing', value: 'Playing' },
                            { name: 'Streaming', value: 'Streaming' },
                            { name: 'Listening', value: 'Listening' },
                            { name: 'Watching', value: 'Watching' },
                            { name: 'Custom', value: 'Custom' },
                            { name: 'Competing', value: 'Competing' },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.name', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.name'),
                        description: Lang.getRef('argDescs.presenceName', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.presenceName'),
                        required: true,
                        min_length: 1,
                        max_length: 128,
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.url', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.url'),
                        description: Lang.getRef('argDescs.presenceUrl', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.presenceUrl'),
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.status', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.status'),
                        description: Lang.getRef('argDescs.presenceStatus', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.presenceStatus'),
                        choices: [
                            { name: 'Online', value: 'online' },
                            { name: 'Idle', value: 'idle' },
                            { name: 'Do Not Disturb', value: 'dnd' },
                            { name: 'Invisible', value: 'invisible' },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('devSubcommands.presenceReset', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devSubcommands.presenceReset'),
                description: Lang.getRef('devSubcommandDescs.presenceReset', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'devSubcommandDescs.presenceReset'
                ),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('devSubcommands.presenceStatus', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devSubcommands.presenceStatus'),
                description: Lang.getRef('devSubcommandDescs.presenceStatus', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'devSubcommandDescs.presenceStatus'
                ),
            },
        ],
    },
    HELP: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.help', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.help'),
        description: Lang.getRef('commandDescs.help', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.help'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.HELP_OPTION,
                required: true,
            },
        ],
    },
    INFO: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.info', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.info'),
        description: Lang.getRef('commandDescs.info', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.info'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.INFO_OPTION,
                required: true,
            },
        ],
    },
    TEST: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.test', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.test'),
        description: Lang.getRef('commandDescs.test', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.test'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    WELCOME: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.welcome', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.welcome'),
        description: Lang.getRef('commandDescs.welcome', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.welcome'),
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.ManageGuild,
        ]).toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.enable', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.enable'),
                description: Lang.getRef('welcomeSubcommandDescs.enable', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.enable'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.Channel,
                        name: Lang.getRef('arguments.channel', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.channel'),
                        description: Lang.getRef('argDescs.welcomeChannel', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.welcomeChannel'),
                        channel_types: [ChannelType.GuildText],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.disable', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.disable'),
                description: Lang.getRef('welcomeSubcommandDescs.disable', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.disable'
                ),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.status', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.status'),
                description: Lang.getRef('welcomeSubcommandDescs.status', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.status'
                ),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.message', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.message'),
                description: Lang.getRef('welcomeSubcommandDescs.message', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.message'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.text', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.text'),
                        description: Lang.getRef('argDescs.welcomeMessage', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.welcomeMessage'),
                        required: true,
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.image', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.image'),
                description: Lang.getRef('welcomeSubcommandDescs.image', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.image'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.url', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.url'),
                        description: Lang.getRef('argDescs.welcomeImageUrl', Language.Default),
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.welcomeImageUrl'
                        ),
                        required: true,
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('welcomeSubcommands.test', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('welcomeSubcommands.test'),
                description: Lang.getRef('welcomeSubcommandDescs.test', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'welcomeSubcommandDescs.test'
                ),
            },
        ],
    },
    YOUTUBE: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.youtube', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.youtube'),
        description: Lang.getRef('commandDescs.youtube', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.youtube'),
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.ManageGuild,
        ]).toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('youtubeSubcommands.subscribe', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('youtubeSubcommands.subscribe'),
                description: Lang.getRef('youtubeSubcommandDescs.subscribe', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'youtubeSubcommandDescs.subscribe'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.youtubeChannel', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.youtubeChannel'),
                        description: Lang.getRef('argDescs.youtubeChannel', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.youtubeChannel'),
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.Channel,
                        name: Lang.getRef('arguments.channel', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.channel'),
                        description: Lang.getRef(
                            'argDescs.youtubeDiscordChannel',
                            Language.Default
                        ),
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.youtubeDiscordChannel'
                        ),
                        channel_types: [ChannelType.GuildText],
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.notify', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.notify'),
                        description: Lang.getRef('argDescs.youtubeNotify', Language.Default),
                        description_localizations:
                            Lang.getRefLocalizationMap('argDescs.youtubeNotify'),
                        choices: [
                            {
                                name: Lang.getRef('youtubeNotifyTypes.all', Language.Default),
                                name_localizations:
                                    Lang.getRefLocalizationMap('youtubeNotifyTypes.all'),
                                value: 'all',
                            },
                            {
                                name: Lang.getRef('youtubeNotifyTypes.videos', Language.Default),
                                name_localizations: Lang.getRefLocalizationMap(
                                    'youtubeNotifyTypes.videos'
                                ),
                                value: 'videos',
                            },
                            {
                                name: Lang.getRef('youtubeNotifyTypes.live', Language.Default),
                                name_localizations:
                                    Lang.getRefLocalizationMap('youtubeNotifyTypes.live'),
                                value: 'live',
                            },
                            {
                                name: Lang.getRef(
                                    'youtubeNotifyTypes.upcomingLive',
                                    Language.Default
                                ),
                                name_localizations: Lang.getRefLocalizationMap(
                                    'youtubeNotifyTypes.upcomingLive'
                                ),
                                value: 'upcoming_live',
                            },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('youtubeSubcommands.unsubscribe', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('youtubeSubcommands.unsubscribe'),
                description: Lang.getRef('youtubeSubcommandDescs.unsubscribe', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'youtubeSubcommandDescs.unsubscribe'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.subscription', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.subscription'),
                        description: Lang.getRef('argDescs.youtubeSubscription', Language.Default),
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.youtubeSubscription'
                        ),
                        required: true,
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('youtubeSubcommands.list', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('youtubeSubcommands.list'),
                description: Lang.getRef('youtubeSubcommandDescs.list', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'youtubeSubcommandDescs.list'
                ),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('youtubeSubcommands.check', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('youtubeSubcommands.check'),
                description: Lang.getRef('youtubeSubcommandDescs.check', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'youtubeSubcommandDescs.check'
                ),
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: Lang.getRef('youtubeSubcommands.test', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('youtubeSubcommands.test'),
                description: Lang.getRef('youtubeSubcommandDescs.test', Language.Default),
                description_localizations: Lang.getRefLocalizationMap(
                    'youtubeSubcommandDescs.test'
                ),
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: Lang.getRef('arguments.subscription', Language.Default),
                        name_localizations: Lang.getRefLocalizationMap('arguments.subscription'),
                        description: Lang.getRef('argDescs.youtubeSubscription', Language.Default),
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.youtubeSubscription'
                        ),
                        required: true,
                    },
                ],
            },
        ],
    },
};

export const MessageCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_SENT: {
        type: ApplicationCommandType.Message,
        name: Lang.getRef('messageCommands.viewDateSent', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('messageCommands.viewDateSent'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};

export const UserCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_JOINED: {
        type: ApplicationCommandType.User,
        name: Lang.getRef('userCommands.viewDateJoined', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('userCommands.viewDateJoined'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};
