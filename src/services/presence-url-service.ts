import { YouTubeService } from './youtube-service.js';

export type PresenceStreamingUrlResolution =
    | {
          type: 'streaming';
          url: string;
          dynamic: boolean;
          urlSource?: string;
      }
    | {
          type: 'none';
          reason: string;
          dynamic?: boolean;
          urlSource?: string;
      };

export class PresenceUrlService {
    private resolvedUrlSources = new Map<string, string>();

    constructor(private youtubeService: YouTubeService) {}

    public async resolveStreamingUrl(input?: string): Promise<PresenceStreamingUrlResolution> {
        if (!input) {
            return { type: 'none', reason: 'No stream URL configured.' };
        }

        let url: URL;
        try {
            url = new URL(input);
        } catch {
            return { type: 'none', reason: 'Stream URL is not a valid URL.' };
        }

        if (this.isTwitchHost(url.hostname)) {
            return { type: 'streaming', url: input, dynamic: false };
        }

        if (this.isYouTubeHost(url.hostname)) {
            return await this.resolveYouTubeUrl(input, url);
        }

        return { type: 'none', reason: 'Stream URL is not a Twitch or YouTube URL.' };
    }

    private async resolveYouTubeUrl(
        input: string,
        url: URL
    ): Promise<PresenceStreamingUrlResolution> {
        let videoId = this.getYouTubeVideoId(url);
        if (videoId) {
            return { type: 'streaming', url: this.buildYouTubeVideoUrl(videoId), dynamic: false };
        }

        if (this.isYouTubeLiveChannelUrl(url)) {
            try {
                let urlSource =
                    this.resolvedUrlSources.get(input) ??
                    (await this.youtubeService.resolveLiveChannelSource(url.toString()));
                this.resolvedUrlSources.set(input, urlSource);

                let liveUrl = await this.youtubeService.resolveCurrentLiveVideoUrl(urlSource);
                return liveUrl
                    ? { type: 'streaming', url: liveUrl, dynamic: true, urlSource }
                    : {
                          type: 'none',
                          reason: 'YouTube channel is not live right now.',
                          dynamic: true,
                          urlSource,
                      };
            } catch (error) {
                return {
                    type: 'none',
                    reason: `Could not resolve YouTube live URL: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    dynamic: true,
                };
            }
        }

        return {
            type: 'none',
            reason: 'YouTube stream URL must be a watch URL, youtu.be URL, or @handle/live URL.',
        };
    }

    private getYouTubeVideoId(url: URL): string | undefined {
        if (url.hostname.toLowerCase() === 'youtu.be') {
            return this.normalizeVideoId(url.pathname.split('/').filter(Boolean)[0]);
        }

        if (this.isYouTubeHost(url.hostname) && url.pathname === '/watch') {
            return this.normalizeVideoId(url.searchParams.get('v'));
        }
    }

    private isYouTubeLiveChannelUrl(url: URL): boolean {
        return (
            this.isYouTubeHost(url.hostname) &&
            (/^\/@[^/]+\/live\/?$/i.test(url.pathname) ||
                /^\/channel\/UC[\w-]{22,}\/live\/?$/i.test(url.pathname))
        );
    }

    private normalizeVideoId(videoId?: string | null): string | undefined {
        return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : undefined;
    }

    private buildYouTubeVideoUrl(videoId: string): string {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    private isTwitchHost(hostname: string): boolean {
        let normalized = hostname.toLowerCase();
        return normalized === 'twitch.tv' || normalized.endsWith('.twitch.tv');
    }

    private isYouTubeHost(hostname: string): boolean {
        let normalized = hostname.toLowerCase();
        return (
            normalized === 'youtube.com' ||
            normalized.endsWith('.youtube.com') ||
            normalized === 'youtu.be'
        );
    }
}
