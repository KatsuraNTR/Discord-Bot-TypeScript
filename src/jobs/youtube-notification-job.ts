import { ChannelType, Client } from 'discord.js';
import { createRequire } from 'node:module';

import { Job } from './index.js';
import { Logger, YouTubeService } from '../services/index.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export class YouTubeNotificationJob extends Job {
    public name = 'YouTube Notifications';
    public schedule: string = Config.jobs.youtubeNotifications?.schedule ?? '0 */5 * * * *';
    public log: boolean = Config.jobs.youtubeNotifications?.log ?? false;
    public runOnce: boolean = Config.jobs.youtubeNotifications?.runOnce ?? false;
    public initialDelaySecs: number = Config.jobs.youtubeNotifications?.initialDelaySecs ?? 30;

    constructor(
        private client: Client,
        private youtubeService: YouTubeService
    ) {
        super();
    }

    public async run(): Promise<void> {
        let notifications = await this.youtubeService.findDueNotifications();
        for (let notification of notifications) {
            try {
                let channel = await this.client.channels.fetch(
                    notification.subscription.discordChannelId
                );
                if (!channel || channel.type !== ChannelType.GuildText) {
                    continue;
                }

                await channel.send(
                    this.youtubeService.buildNotificationMessage(
                        notification.video,
                        notification.subscription
                    )
                );
                await this.youtubeService.markNotified(
                    notification.subscription.id,
                    notification.video
                );
            } catch (error) {
                Logger.error(
                    `Failed to send YouTube notification for ${notification.video.videoId}`,
                    error
                );
            }
        }
    }
}
