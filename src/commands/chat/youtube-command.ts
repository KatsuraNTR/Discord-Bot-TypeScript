import {
    ChannelType,
    ChatInputCommandInteraction,
    PermissionsString,
    TextChannel,
} from 'discord.js';

import { EventData } from '../../models/internal-models.js';
import { Lang, YouTubeNotifyType, YouTubeService } from '../../services/index.js';
import { InteractionUtils, PermissionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class YouTubeSubscribeCommand implements Command {
    public names = ['youtube', 'subscribe'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private youtubeService: YouTubeService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        let channel =
            intr.options.getChannel(Lang.getRef('arguments.channel', data.lang), false, [
                ChannelType.GuildText,
            ]) ??
            (intr.channel instanceof TextChannel ? intr.channel : undefined);

        if (!intr.guild || !channel) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        if (!PermissionUtils.canSend(channel, true)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.youtubeMissingChannelPerms', data.lang)
            );
            return;
        }

        let youtubeChannel = intr.options.getString(
            Lang.getRef('arguments.youtubeChannel', data.lang),
            true
        );
        let notify = intr.options.getString(Lang.getRef('arguments.notify', data.lang), false) as
            | YouTubeNotifyType
            | null;

        let subscription = await this.youtubeService.subscribe(
            intr.guild.id,
            channel.id,
            youtubeChannel,
            notify ?? 'all',
            intr.user.id
        );

        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.youtubeSubscribed', data.lang, {
                CHANNEL: channel.toString(),
                YOUTUBE_CHANNEL: subscription.youtubeChannelTitle,
                NOTIFY: subscription.notify,
                SUBSCRIPTION_ID: subscription.id,
            })
        );
    }
}

export class YouTubeUnsubscribeCommand implements Command {
    public names = ['youtube', 'unsubscribe'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private youtubeService: YouTubeService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let query = intr.options.getString(Lang.getRef('arguments.subscription', data.lang), true);
        let subscription = await this.youtubeService.unsubscribe(intr.guild.id, query);
        if (!subscription) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.youtubeSubscriptionNotFound', data.lang)
            );
            return;
        }

        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.youtubeUnsubscribed', data.lang, {
                YOUTUBE_CHANNEL: subscription.youtubeChannelTitle,
            })
        );
    }
}

export class YouTubeListCommand implements Command {
    public names = ['youtube', 'list'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private youtubeService: YouTubeService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let subscriptions = await this.youtubeService.list(intr.guild.id);
        let lines =
            subscriptions.length > 0
                ? subscriptions.map(
                      sub =>
                          `\`${sub.id}\` - **${sub.youtubeChannelTitle}** -> <#${sub.discordChannelId}> (${sub.notify})`
                  )
                : [Lang.getRef('youtube.noSubscriptions', data.lang)];

        await InteractionUtils.send(intr, {
            embeds: [
                Lang.getEmbed('displayEmbeds.youtubeList', data.lang, {
                    SUBSCRIPTIONS: lines.join('\n'),
                }),
            ],
        });
    }
}

export class YouTubeCheckCommand implements Command {
    public names = ['youtube', 'check'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private youtubeService: YouTubeService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let subscriptions = await this.youtubeService.list(intr.guild.id);
        let count = 0;
        for (let subscription of subscriptions) {
            let notifications = await this.youtubeService.findDueNotifications(subscription);
            count += notifications.length;
            for (let notification of notifications) {
                let channel = await intr.client.channels.fetch(subscription.discordChannelId);
                if (!channel || channel.type !== ChannelType.GuildText) {
                    continue;
                }

                await channel.send(
                    this.youtubeService.buildNotificationMessage(
                        notification.video,
                        notification.subscription
                    )
                );
                await this.youtubeService.markNotified(subscription.id, notification.video);
            }
        }

        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.youtubeChecked', data.lang, {
                COUNT: count.toString(),
            })
        );
    }
}

export class YouTubeTestCommand implements Command {
    public names = ['youtube', 'test'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private youtubeService: YouTubeService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let subscriptionId = intr.options.getString(
            Lang.getRef('arguments.subscription', data.lang),
            true
        );
        let subscription = await this.youtubeService.get(subscriptionId);
        if (!subscription || subscription.guildId !== intr.guild.id) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.youtubeSubscriptionNotFound', data.lang)
            );
            return;
        }

        let video = await this.youtubeService.getLatestVideo(subscription);
        if (!video) {
            await InteractionUtils.send(intr, 'No recent YouTube videos found for that subscription.');
            return;
        }

        await InteractionUtils.send(intr, this.youtubeService.buildNotificationMessage(video, subscription));
    }
}
