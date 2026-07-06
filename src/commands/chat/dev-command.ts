import djs, {
    ActivityType,
    ChatInputCommandInteraction,
    PermissionsString,
    PresenceStatusData,
} from 'discord.js';
import { createRequire } from 'node:module';
import os from 'node:os';

import { DevCommandName } from '../../enums/index.js';
import { CustomClient } from '../../extensions/index.js';
import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang, PresenceActivitySettings, PresenceSettingsService } from '../../services/index.js';
import { FormatUtils, InteractionUtils, ShardUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

const require = createRequire(import.meta.url);
const typescriptVersion: string = require('typescript/package.json').version;

let Config = require('../../../config/config.json');
let TsConfig = require('../../../tsconfig.json');

export class DevCommand implements Command {
    public names = [Lang.getRef('chatCommands.dev', Language.Default)];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private presenceSettingsService: PresenceSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!Config.developers.includes(intr.user.id)) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.devOnly', data.lang));
            return;
        }

        let args = {
            subcommand: intr.options.getSubcommand(false),
            command: intr.options.getString(
                Lang.getRef('arguments.command', Language.Default)
            ) as DevCommandName,
        };

        switch (args.subcommand ?? args.command) {
            case Lang.getRef('devSubcommands.info', Language.Default):
            case DevCommandName.INFO: {
                let shardCount = intr.client.shard?.count ?? 1;
                let serverCount: number;
                if (intr.client.shard) {
                    try {
                        serverCount = await ShardUtils.serverCount(intr.client.shard);
                    } catch (error) {
                        if (error.name.includes('ShardingInProcess')) {
                            await InteractionUtils.send(
                                intr,
                                Lang.getEmbed('errorEmbeds.startupInProcess', data.lang)
                            );
                            return;
                        } else {
                            throw error;
                        }
                    }
                } else {
                    serverCount = intr.client.guilds.cache.size;
                }

                let memory = process.memoryUsage();

                await InteractionUtils.send(
                    intr,
                    Lang.getEmbed('displayEmbeds.devInfo', data.lang, {
                        NODE_VERSION: process.version,
                        TS_VERSION: `v${typescriptVersion}`,
                        ES_VERSION: TsConfig.compilerOptions.target,
                        DJS_VERSION: `v${djs.version}`,
                        SHARD_COUNT: shardCount.toLocaleString(data.lang),
                        SERVER_COUNT: serverCount.toLocaleString(data.lang),
                        SERVER_COUNT_PER_SHARD: Math.round(serverCount / shardCount).toLocaleString(
                            data.lang
                        ),
                        RSS_SIZE: FormatUtils.fileSize(memory.rss),
                        RSS_SIZE_PER_SERVER:
                            serverCount > 0
                                ? FormatUtils.fileSize(memory.rss / serverCount)
                                : Lang.getRef('other.na', data.lang),
                        HEAP_TOTAL_SIZE: FormatUtils.fileSize(memory.heapTotal),
                        HEAP_TOTAL_SIZE_PER_SERVER:
                            serverCount > 0
                                ? FormatUtils.fileSize(memory.heapTotal / serverCount)
                                : Lang.getRef('other.na', data.lang),
                        HEAP_USED_SIZE: FormatUtils.fileSize(memory.heapUsed),
                        HEAP_USED_SIZE_PER_SERVER:
                            serverCount > 0
                                ? FormatUtils.fileSize(memory.heapUsed / serverCount)
                                : Lang.getRef('other.na', data.lang),
                        HOSTNAME: os.hostname(),
                        SHARD_ID: (intr.guild?.shardId ?? 0).toString(),
                        SERVER_ID: intr.guild?.id ?? Lang.getRef('other.na', data.lang),
                        BOT_ID: intr.client.user?.id,
                        USER_ID: intr.user.id,
                    })
                );
                break;
            }
            case Lang.getRef('devSubcommands.presenceSet', Language.Default): {
                let activityTypeName = intr.options.getString(
                    Lang.getRef('arguments.activityType', Language.Default),
                    true
                );
                let name = intr.options.getString(
                    Lang.getRef('arguments.name', Language.Default),
                    true
                );
                let url = intr.options.getString(Lang.getRef('arguments.url', Language.Default));
                let status = intr.options.getString(
                    Lang.getRef('arguments.status', Language.Default)
                ) as PresenceStatusData;
                let activityType = ActivityType[activityTypeName];

                if (activityType === undefined || typeof activityType !== 'number') {
                    await InteractionUtils.send(intr, `Unknown activity type: ${activityTypeName}`);
                    return;
                }

                if (activityType === ActivityType.Streaming && !url) {
                    await InteractionUtils.send(intr, 'Streaming presence requires a stream URL.');
                    return;
                }

                if (activityType !== ActivityType.Streaming && url) {
                    await InteractionUtils.send(
                        intr,
                        'Presence URL is only supported for streaming activity.'
                    );
                    return;
                }

                if (url && !this.isSupportedStreamingUrl(url)) {
                    await InteractionUtils.send(
                        intr,
                        'Streaming URL must be a Twitch or YouTube URL.'
                    );
                    return;
                }

                let activity: PresenceActivitySettings = {
                    type: activityType,
                    name,
                    url: activityType === ActivityType.Streaming ? url : undefined,
                };

                await this.presenceSettingsService.setManual(activity, status);
                await this.applyPresence(intr, activity, status);

                await InteractionUtils.send(
                    intr,
                    `Presence set to ${activityTypeName}: ${name}${status ? ` (${status})` : ''}.`
                );
                break;
            }
            case Lang.getRef('devSubcommands.presenceReset', Language.Default): {
                await this.presenceSettingsService.setServerCount();
                let applied = await this.applyServerCountPresence(intr, data);
                if (!applied) {
                    return;
                }
                await InteractionUtils.send(intr, 'Presence reset to automatic server count.');
                break;
            }
            case Lang.getRef('devSubcommands.presenceStatus', Language.Default): {
                let settings = await this.presenceSettingsService.get();
                if (settings.mode === 'server-count') {
                    await InteractionUtils.send(intr, 'Presence mode: automatic server count.');
                    return;
                }

                let activity = settings.activity;
                await InteractionUtils.send(
                    intr,
                    activity
                        ? `Presence mode: manual\nType: ${ActivityType[activity.type]}\nName: ${activity.name}\nURL: ${activity.url ?? Lang.getRef('other.na', data.lang)}\nStatus: ${settings.status ?? Lang.getRef('other.na', data.lang)}`
                        : 'Presence mode: manual, but no activity is stored.'
                );
                break;
            }
            default: {
                return;
            }
        }
    }

    private async applyPresence(
        intr: ChatInputCommandInteraction,
        activity: PresenceActivitySettings,
        status?: PresenceStatusData
    ): Promise<void> {
        if (intr.client.shard) {
            await intr.client.shard.broadcastEval(
                (client, context) => {
                    let customClient = client as CustomClient;
                    return customClient.setPresence(context.activity, context.status);
                },
                { context: { activity, status } }
            );
            return;
        }

        (intr.client as CustomClient).setPresence(activity, status);
    }

    private async applyServerCountPresence(
        intr: ChatInputCommandInteraction,
        data: EventData
    ): Promise<boolean> {
        let serverCount: number;
        if (intr.client.shard) {
            try {
                serverCount = await ShardUtils.serverCount(intr.client.shard);
            } catch (error) {
                if (error.name.includes('ShardingInProcess')) {
                    await InteractionUtils.send(
                        intr,
                        Lang.getEmbed('errorEmbeds.startupInProcess', data.lang)
                    );
                    return false;
                }

                throw error;
            }
        } else {
            serverCount = intr.client.guilds.cache.size;
        }

        await this.applyPresence(intr, {
            type: ActivityType.Streaming,
            name: `to ${serverCount.toLocaleString(data.lang)} servers`,
            url: Lang.getCom('links.stream'),
        });
        return true;
    }

    private isSupportedStreamingUrl(url: string): boolean {
        let hostname: string;
        try {
            hostname = new URL(url).hostname.toLowerCase();
        } catch {
            return false;
        }

        return (
            hostname === 'twitch.tv' ||
            hostname.endsWith('.twitch.tv') ||
            hostname === 'youtube.com' ||
            hostname.endsWith('.youtube.com') ||
            hostname === 'youtu.be'
        );
    }
}
