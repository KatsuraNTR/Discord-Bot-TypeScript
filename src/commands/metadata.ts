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
                ...Args.DEV_COMMAND,
                required: true,
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
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.welcomeChannel'
                        ),
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
                        description_localizations: Lang.getRefLocalizationMap(
                            'argDescs.welcomeMessage'
                        ),
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
