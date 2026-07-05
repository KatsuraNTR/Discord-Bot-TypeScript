import Database from 'better-sqlite3';
import { ColorResolvable, EmbedBuilder, resolveColor } from 'discord.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { Lang, Logger } from './index.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export type YouTubeNotifyType = 'all' | 'videos' | 'live' | 'upcoming_live';
export type YouTubeVideoType = 'video' | 'live' | 'upcoming_live' | 'ended_live';

export interface YouTubeSubscription {
    id: string;
    guildId: string;
    discordChannelId: string;
    youtubeChannelId: string;
    youtubeChannelTitle: string;
    youtubeChannelIconUrl?: string;
    notify: YouTubeNotifyType;
    createdBy: string;
    createdAt: string;
    enabled: boolean;
}

export interface YouTubeVideo {
    videoId: string;
    channelId: string;
    channelTitle?: string;
    channelIconUrl?: string;
    title: string;
    url: string;
    publishedAt?: string;
    updatedAt?: string;
    thumbnailUrl?: string;
    type: YouTubeVideoType;
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
}

interface SubscriptionRow {
    id: string;
    guild_id: string;
    discord_channel_id: string;
    youtube_channel_id: string;
    youtube_channel_title: string;
    youtube_channel_icon_url?: string;
    notify: YouTubeNotifyType;
    created_by: string;
    created_at: string;
    enabled: number;
}

export class YouTubeService {
    private apiKey: string | undefined = Config.youtube?.apiKey;
    private db: Database.Database;

    constructor(
        dbFilePath: string = Config.youtube?.databaseFilePath ?? 'data/youtube-subscriptions.sqlite'
    ) {
        fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
        this.db = new Database(dbFilePath);
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('journal_mode = WAL');
        this.migrateSchema();
    }

    public async subscribe(
        guildId: string,
        discordChannelId: string,
        channelInput: string,
        notify: YouTubeNotifyType,
        createdBy: string
    ): Promise<YouTubeSubscription> {
        let youtubeChannel = await this.resolveChannel(channelInput);
        let existing = this.getSubscriptionByUniqueKey(
            guildId,
            discordChannelId,
            youtubeChannel.id
        );

        if (existing) {
            let updated: YouTubeSubscription = {
                ...existing,
                notify,
                enabled: true,
                youtubeChannelTitle: youtubeChannel.title,
                youtubeChannelIconUrl: youtubeChannel.iconUrl,
            };
            this.upsertSubscription(updated);
            await this.seedSubscriptionBaseline(updated);
            return updated;
        }

        let subscription: YouTubeSubscription = {
            id: randomUUID(),
            guildId,
            discordChannelId,
            youtubeChannelId: youtubeChannel.id,
            youtubeChannelTitle: youtubeChannel.title,
            youtubeChannelIconUrl: youtubeChannel.iconUrl,
            notify,
            createdBy,
            createdAt: new Date().toISOString(),
            enabled: true,
        };

        this.upsertSubscription(subscription);
        await this.seedSubscriptionBaseline(subscription);
        return subscription;
    }

    public async unsubscribe(guildId: string, query: string): Promise<YouTubeSubscription | undefined> {
        let normalizedQuery = query.trim().toLowerCase();
        let row = this.db
            .prepare(
                `
                SELECT *
                FROM youtube_subscriptions
                WHERE guild_id = ?
                  AND (
                    id = ?
                    OR lower(youtube_channel_id) = ?
                    OR lower(youtube_channel_title) = ?
                  )
                LIMIT 1
                `
            )
            .get(guildId, query, normalizedQuery, normalizedQuery) as SubscriptionRow | undefined;

        if (!row) {
            return;
        }

        let remove = this.db.transaction(() => {
            this.db.prepare('DELETE FROM youtube_subscriptions WHERE id = ?').run(row.id);
            this.pruneOrphanVideoStates();
        });
        remove();
        return this.mapSubscription(row);
    }

    public async list(guildId: string): Promise<YouTubeSubscription[]> {
        let rows = this.db
            .prepare(
                `
                SELECT *
                FROM youtube_subscriptions
                WHERE guild_id = ?
                ORDER BY created_at ASC
                `
            )
            .all(guildId) as SubscriptionRow[];
        return rows.map(row => this.mapSubscription(row));
    }

    public async get(subscriptionId: string): Promise<YouTubeSubscription | undefined> {
        let row = this.db
            .prepare('SELECT * FROM youtube_subscriptions WHERE id = ?')
            .get(subscriptionId) as SubscriptionRow | undefined;
        return row ? this.mapSubscription(row) : undefined;
    }

    public async findDueNotifications(subscription?: YouTubeSubscription): Promise<
        {
            subscription: YouTubeSubscription;
            video: YouTubeVideo;
        }[]
    > {
        let subscriptions = subscription ? [subscription] : this.listEnabledSubscriptions();
        let notifications: { subscription: YouTubeSubscription; video: YouTubeVideo }[] = [];

        for (let sub of subscriptions) {
            let videos = await this.fetchRecentVideos(sub.youtubeChannelId);
            for (let video of videos) {
                this.upsertVideoState(video);
                let alreadyNotified = this.hasNotification(sub.id, video.videoId, video.type);
                if (this.shouldNotifySubscription(sub, video) && !alreadyNotified) {
                    notifications.push({ subscription: sub, video });
                }
            }
        }

        return notifications;
    }

    public async markNotified(subscriptionId: string, video: YouTubeVideo): Promise<void> {
        this.upsertVideoState(video);
        this.insertNotification(subscriptionId, video.videoId, video.type);
    }

    public async getLatestVideo(subscription: YouTubeSubscription): Promise<YouTubeVideo | undefined> {
        let videos = await this.fetchRecentVideos(subscription.youtubeChannelId);
        return videos.find(video => this.shouldNotify(subscription.notify, video.type)) ?? videos[0];
    }

    public buildNotificationMessage(
        video: YouTubeVideo,
        subscription?: YouTubeSubscription
    ): { content: string; embeds: EmbedBuilder[] } {
        return {
            content: video.url,
            embeds: [this.buildNotificationEmbed(video, subscription)],
        };
    }

    public buildNotificationEmbed(
        video: YouTubeVideo,
        subscription?: YouTubeSubscription
    ): EmbedBuilder {
        let label =
            video.type === 'upcoming_live'
                ? 'Live scheduled'
                : video.type === 'live'
                  ? 'Live now'
                  : video.type === 'ended_live'
                    ? 'Live ended'
                    : 'New video';
        let channelId = subscription?.youtubeChannelId ?? video.channelId;
        let channelTitle =
            subscription?.youtubeChannelTitle ?? video.channelTitle ?? video.channelId;

        let embed = new EmbedBuilder()
            .setAuthor({
                name: channelTitle,
                url: this.buildChannelUrl(channelId),
                iconURL: subscription?.youtubeChannelIconUrl ?? video.channelIconUrl,
            })
            .setTitle(video.title)
            .setURL(video.url)
            .setDescription(`**${label}**`)
            .setColor(resolveColor(Lang.getCom('colors.default') as ColorResolvable))
            .setTimestamp(new Date(video.publishedAt ?? Date.now()));

        if (video.thumbnailUrl) {
            embed.setImage(video.thumbnailUrl);
        }

        return embed;
    }

    private migrateSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS youtube_subscriptions (
                id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                discord_channel_id TEXT NOT NULL,
                youtube_channel_id TEXT NOT NULL,
                youtube_channel_title TEXT NOT NULL,
                youtube_channel_icon_url TEXT,
                notify TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                UNIQUE (guild_id, discord_channel_id, youtube_channel_id)
            );

            CREATE INDEX IF NOT EXISTS idx_youtube_subscriptions_guild
                ON youtube_subscriptions (guild_id);

            CREATE INDEX IF NOT EXISTS idx_youtube_subscriptions_enabled
                ON youtube_subscriptions (enabled);

            CREATE TABLE IF NOT EXISTS youtube_video_states (
                video_id TEXT PRIMARY KEY,
                youtube_channel_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT,
                url TEXT NOT NULL,
                published_at TEXT,
                scheduled_start_time TEXT,
                actual_start_time TEXT,
                actual_end_time TEXT,
                thumbnail_url TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_youtube_video_states_channel
                ON youtube_video_states (youtube_channel_id);

            CREATE TABLE IF NOT EXISTS youtube_subscription_notifications (
                subscription_id TEXT NOT NULL,
                video_id TEXT NOT NULL,
                type TEXT NOT NULL,
                notified_at TEXT NOT NULL,
                PRIMARY KEY (subscription_id, video_id, type),
                FOREIGN KEY (subscription_id)
                    REFERENCES youtube_subscriptions (id)
                    ON DELETE CASCADE,
                FOREIGN KEY (video_id)
                    REFERENCES youtube_video_states (video_id)
                    ON DELETE CASCADE
            );
        `);
    }

    private upsertSubscription(subscription: YouTubeSubscription): void {
        this.db
            .prepare(
                `
                INSERT INTO youtube_subscriptions (
                    id,
                    guild_id,
                    discord_channel_id,
                    youtube_channel_id,
                    youtube_channel_title,
                    youtube_channel_icon_url,
                    notify,
                    created_by,
                    created_at,
                    enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    guild_id = excluded.guild_id,
                    discord_channel_id = excluded.discord_channel_id,
                    youtube_channel_id = excluded.youtube_channel_id,
                    youtube_channel_title = excluded.youtube_channel_title,
                    youtube_channel_icon_url = excluded.youtube_channel_icon_url,
                    notify = excluded.notify,
                    created_by = excluded.created_by,
                    created_at = excluded.created_at,
                    enabled = excluded.enabled
                `
            )
            .run(
                subscription.id,
                subscription.guildId,
                subscription.discordChannelId,
                subscription.youtubeChannelId,
                subscription.youtubeChannelTitle,
                subscription.youtubeChannelIconUrl,
                subscription.notify,
                subscription.createdBy,
                subscription.createdAt,
                subscription.enabled ? 1 : 0
            );
    }

    private upsertVideoState(video: YouTubeVideo): void {
        this.db
            .prepare(
                `
                INSERT INTO youtube_video_states (
                    video_id,
                    youtube_channel_id,
                    type,
                    title,
                    url,
                    published_at,
                    scheduled_start_time,
                    actual_start_time,
                    actual_end_time,
                    thumbnail_url,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(video_id) DO UPDATE SET
                    youtube_channel_id = excluded.youtube_channel_id,
                    type = excluded.type,
                    title = excluded.title,
                    url = excluded.url,
                    published_at = excluded.published_at,
                    scheduled_start_time = excluded.scheduled_start_time,
                    actual_start_time = excluded.actual_start_time,
                    actual_end_time = excluded.actual_end_time,
                    thumbnail_url = excluded.thumbnail_url,
                    updated_at = excluded.updated_at
                `
            )
            .run(
                video.videoId,
                video.channelId,
                video.type,
                video.title,
                video.url,
                video.publishedAt,
                video.scheduledStartTime,
                video.actualStartTime,
                video.actualEndTime,
                video.thumbnailUrl,
                new Date().toISOString()
            );
    }

    private insertNotification(
        subscriptionId: string,
        videoId: string,
        type: YouTubeVideoType
    ): void {
        this.db
            .prepare(
                `
                INSERT OR IGNORE INTO youtube_subscription_notifications (
                    subscription_id,
                    video_id,
                    type,
                    notified_at
                ) VALUES (?, ?, ?, ?)
                `
            )
            .run(subscriptionId, videoId, type, new Date().toISOString());
    }

    private pruneOrphanVideoStates(): void {
        this.db
            .prepare(
                `
                DELETE FROM youtube_video_states
                WHERE video_id NOT IN (
                    SELECT DISTINCT video_id
                    FROM youtube_subscription_notifications
                )
                `
            )
            .run();
    }

    private hasNotification(
        subscriptionId: string,
        videoId: string,
        type: YouTubeVideoType
    ): boolean {
        return Boolean(
            this.db
                .prepare(
                    `
                    SELECT 1
                    FROM youtube_subscription_notifications
                    WHERE subscription_id = ?
                      AND video_id = ?
                      AND type = ?
                    LIMIT 1
                    `
                )
                .get(subscriptionId, videoId, type)
        );
    }

    private listEnabledSubscriptions(): YouTubeSubscription[] {
        let rows = this.db
            .prepare(
                `
                SELECT *
                FROM youtube_subscriptions
                WHERE enabled = 1
                ORDER BY created_at ASC
                `
            )
            .all() as SubscriptionRow[];
        return rows.map(row => this.mapSubscription(row));
    }

    private getSubscriptionByUniqueKey(
        guildId: string,
        discordChannelId: string,
        youtubeChannelId: string
    ): YouTubeSubscription | undefined {
        let row = this.db
            .prepare(
                `
                SELECT *
                FROM youtube_subscriptions
                WHERE guild_id = ?
                  AND discord_channel_id = ?
                  AND youtube_channel_id = ?
                LIMIT 1
                `
            )
            .get(guildId, discordChannelId, youtubeChannelId) as SubscriptionRow | undefined;
        return row ? this.mapSubscription(row) : undefined;
    }

    private mapSubscription(row: SubscriptionRow): YouTubeSubscription {
        return {
            id: row.id,
            guildId: row.guild_id,
            discordChannelId: row.discord_channel_id,
            youtubeChannelId: row.youtube_channel_id,
            youtubeChannelTitle: row.youtube_channel_title,
            youtubeChannelIconUrl: row.youtube_channel_icon_url,
            notify: row.notify,
            createdBy: row.created_by,
            createdAt: row.created_at,
            enabled: row.enabled === 1,
        };
    }

    private async seedSubscriptionBaseline(subscription: YouTubeSubscription): Promise<void> {
        let videos = await this.fetchRecentVideos(subscription.youtubeChannelId);
        let seed = this.db.transaction((items: YouTubeVideo[]) => {
            for (let video of items) {
                this.upsertVideoState(video);
                if (this.shouldNotifySubscription(subscription, video)) {
                    this.insertNotification(subscription.id, video.videoId, video.type);
                }
            }
        });
        seed(videos);
    }

    private async resolveChannel(
        input: string
    ): Promise<{ id: string; title: string; iconUrl?: string }> {
        let channelId = this.parseChannelId(input);
        if (channelId) {
            return await this.fetchChannel(channelId);
        }

        if (!this.apiKey) {
            throw new Error('A YouTube API key is required for handles, custom URLs, and usernames.');
        }

        let query = input.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//i, '');
        let searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('type', 'channel');
        searchUrl.searchParams.set('maxResults', '1');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('key', this.apiKey);

        let res = await fetch(searchUrl);
        if (!res.ok) {
            throw new Error(`YouTube channel lookup failed: ${res.status} ${res.statusText}`);
        }

        let body = (await res.json()) as {
            items?: {
                id?: {
                    channelId?: string;
                };
                snippet?: {
                    channelTitle?: string;
                    title?: string;
                    thumbnails?: {
                        default?: { url?: string };
                        medium?: { url?: string };
                        high?: { url?: string };
                    };
                };
            }[];
        };
        let item = body.items?.[0];
        if (!item?.id?.channelId) {
            throw new Error('No YouTube channel found for that input.');
        }

        return {
            id: item.id.channelId,
            title: item.snippet?.channelTitle ?? item.snippet?.title ?? item.id.channelId,
            iconUrl:
                item.snippet?.thumbnails?.high?.url ??
                item.snippet?.thumbnails?.medium?.url ??
                item.snippet?.thumbnails?.default?.url,
        };
    }

    private parseChannelId(input: string): string | undefined {
        let trimmed = input.trim();
        let channelMatch = /(?:youtube\.com\/channel\/|^)(UC[\w-]{22,})/i.exec(trimmed);
        return channelMatch?.[1];
    }

    private async fetchChannel(
        channelId: string
    ): Promise<{ id: string; title: string; iconUrl?: string }> {
        if (this.apiKey) {
            let url = new URL('https://www.googleapis.com/youtube/v3/channels');
            url.searchParams.set('part', 'snippet');
            url.searchParams.set('id', channelId);
            url.searchParams.set('key', this.apiKey);

            let res = await fetch(url);
            if (res.ok) {
                let body = (await res.json()) as {
                    items?: {
                        snippet?: {
                            title?: string;
                            thumbnails?: {
                                default?: { url?: string };
                                medium?: { url?: string };
                                high?: { url?: string };
                            };
                        };
                    }[];
                };
                let item = body.items?.[0];
                if (item?.snippet?.title) {
                    return {
                        id: channelId,
                        title: item.snippet.title,
                        iconUrl:
                            item.snippet.thumbnails?.high?.url ??
                            item.snippet.thumbnails?.medium?.url ??
                            item.snippet.thumbnails?.default?.url,
                    };
                }
            } else {
                Logger.warn(`YouTube channel API lookup failed: ${res.status} ${res.statusText}`);
            }
        }

        let videos = await this.fetchFeed(channelId);
        return {
            id: channelId,
            title: videos[0]?.channelTitle ?? channelId,
        };
    }

    private async fetchRecentVideos(channelId: string): Promise<YouTubeVideo[]> {
        let videos: YouTubeVideo[];
        try {
            videos = await this.fetchFeed(channelId);
        } catch (error) {
            if (!this.apiKey) {
                throw error;
            }

            Logger.warn(`YouTube RSS lookup failed for ${channelId}; falling back to API search.`);
            videos = await this.fetchRecentVideosFromApiSearch(channelId);
        }

        if (!this.apiKey || videos.length === 0) {
            return videos;
        }

        let url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,liveStreamingDetails');
        url.searchParams.set('id', videos.map(video => video.videoId).join(','));
        url.searchParams.set('key', this.apiKey);

        let res = await fetch(url);
        if (!res.ok) {
            throw new Error(`YouTube videos lookup failed: ${res.status} ${res.statusText}`);
        }

        let body = (await res.json()) as {
            items?: {
                id?: string;
                snippet?: {
                    liveBroadcastContent?: string;
                    title?: string;
                    channelTitle?: string;
                    publishedAt?: string;
                    thumbnails?: {
                        maxres?: { url?: string };
                        high?: { url?: string };
                        default?: { url?: string };
                    };
                };
                liveStreamingDetails?: {
                    scheduledStartTime?: string;
                    actualStartTime?: string;
                    actualEndTime?: string;
                };
            }[];
        };
        let byId = new Map<string, YouTubeVideo>(videos.map(video => [video.videoId, video]));
        for (let item of body.items ?? []) {
            let video = byId.get(item.id);
            if (!video) {
                continue;
            }

            let liveDetails = item.liveStreamingDetails ?? {};
            video.type = this.classifyVideo(item.snippet?.liveBroadcastContent, liveDetails);
            video.title = item.snippet?.title ?? video.title;
            video.channelTitle = item.snippet?.channelTitle ?? video.channelTitle;
            video.publishedAt = item.snippet?.publishedAt ?? video.publishedAt;
            video.scheduledStartTime = liveDetails.scheduledStartTime;
            video.actualStartTime = liveDetails.actualStartTime;
            video.actualEndTime = liveDetails.actualEndTime;
            video.thumbnailUrl =
                item.snippet?.thumbnails?.maxres?.url ??
                item.snippet?.thumbnails?.high?.url ??
                item.snippet?.thumbnails?.default?.url ??
                video.thumbnailUrl;
        }

        return [...byId.values()];
    }

    private buildChannelUrl(channelId: string): string {
        return `https://www.youtube.com/channel/${channelId}`;
    }

    private async fetchRecentVideosFromApiSearch(channelId: string): Promise<YouTubeVideo[]> {
        let url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('channelId', channelId);
        url.searchParams.set('type', 'video');
        url.searchParams.set('order', 'date');
        url.searchParams.set('maxResults', '10');
        url.searchParams.set('key', this.apiKey);

        let res = await fetch(url);
        if (!res.ok) {
            throw new Error(`YouTube search lookup failed: ${res.status} ${res.statusText}`);
        }

        let body = (await res.json()) as {
            items?: {
                id?: {
                    videoId?: string;
                };
                snippet?: {
                    channelId?: string;
                    channelTitle?: string;
                    liveBroadcastContent?: string;
                    title?: string;
                    publishedAt?: string;
                    thumbnails?: {
                        high?: { url?: string };
                        default?: { url?: string };
                    };
                };
            }[];
        };

        return (body.items ?? [])
            .filter(item => item.id?.videoId)
            .map(item => ({
                videoId: item.id.videoId,
                channelId: item.snippet?.channelId ?? channelId,
                channelTitle: item.snippet?.channelTitle,
                title: item.snippet?.title ?? item.id.videoId,
                url: `https://youtu.be/${item.id.videoId}`,
                publishedAt: item.snippet?.publishedAt,
                thumbnailUrl:
                    item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url,
                type: this.classifyVideo(item.snippet?.liveBroadcastContent, {}),
            }));
    }

    private classifyVideo(
        liveBroadcastContent: string | undefined,
        liveDetails: {
            scheduledStartTime?: string;
            actualStartTime?: string;
            actualEndTime?: string;
        }
    ): YouTubeVideoType {
        if (liveDetails.actualEndTime) {
            return 'ended_live';
        }

        if (liveDetails.actualStartTime || liveBroadcastContent === 'live') {
            return 'live';
        }

        if (liveDetails.scheduledStartTime || liveBroadcastContent === 'upcoming') {
            return 'upcoming_live';
        }

        return 'video';
    }

    private async fetchFeed(channelId: string): Promise<YouTubeVideo[]> {
        let url = new URL('https://www.youtube.com/feeds/videos.xml');
        url.searchParams.set('channel_id', channelId);
        let res = await fetch(url);
        if (!res.ok) {
            throw new Error(`YouTube RSS lookup failed: ${res.status} ${res.statusText}`);
        }

        let xml = await res.text();
        return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(entryMatch => {
            let entry = entryMatch[1];
            let videoId = this.extractXml(entry, 'yt:videoId') ?? '';
            return {
                videoId,
                channelId: this.extractXml(entry, 'yt:channelId') ?? channelId,
                channelTitle:
                    this.extractXml(entry, 'author>\\s*<name') ?? this.extractXml(xml, 'title'),
                title: this.extractXml(entry, 'title') ?? videoId,
                url: this.extractXmlAttribute(entry, 'link', 'href') ?? `https://youtu.be/${videoId}`,
                publishedAt: this.extractXml(entry, 'published'),
                updatedAt: this.extractXml(entry, 'updated'),
                thumbnailUrl: this.extractXmlAttribute(entry, 'media:thumbnail', 'url'),
                type: 'video',
            };
        });
    }

    private extractXml(xml: string, tag: string): string | undefined {
        let match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag.split('>').pop()}>`).exec(xml);
        return match ? this.decodeXml(match[1]) : undefined;
    }

    private extractXmlAttribute(xml: string, tag: string, attr: string): string | undefined {
        let match = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*>`).exec(xml);
        return match ? this.decodeXml(match[1]) : undefined;
    }

    private decodeXml(value: string): string {
        return value
            .replaceAll('&amp;', '&')
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>')
            .replaceAll('&quot;', '"')
            .replaceAll('&#39;', '\'');
    }

    private shouldNotify(notify: YouTubeNotifyType, type: YouTubeVideoType): boolean {
        if (notify === 'all') {
            return type !== 'ended_live';
        }

        if (notify === 'videos') {
            return type === 'video';
        }

        if (notify === 'live') {
            return type === 'live';
        }

        return type === 'upcoming_live';
    }

    private shouldNotifySubscription(
        subscription: YouTubeSubscription,
        video: YouTubeVideo
    ): boolean {
        if (!this.shouldNotify(subscription.notify, video.type)) {
            return false;
        }

        let eventTime = this.getVideoEventTime(video);
        return !eventTime || eventTime > new Date(subscription.createdAt).getTime();
    }

    private getVideoEventTime(video: YouTubeVideo): number | undefined {
        let timestamp =
            video.type === 'live'
                ? video.actualStartTime ?? video.publishedAt
                : video.type === 'upcoming_live'
                  ? video.scheduledStartTime ?? video.publishedAt
                  : video.publishedAt;

        if (!timestamp) {
            return;
        }

        let time = new Date(timestamp).getTime();
        return Number.isNaN(time) ? undefined : time;
    }
}
