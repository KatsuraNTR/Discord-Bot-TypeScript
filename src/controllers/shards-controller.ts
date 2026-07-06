import { ActivityType, PresenceStatusData, ShardingManager } from 'discord.js';
import { Request, Response, Router } from 'express';
import { createRequire } from 'node:module';

import { Controller } from './index.js';
import { CustomClient } from '../extensions/index.js';
import { mapClass } from '../middleware/index.js';
import {
    GetShardsResponse,
    SetShardPresencesRequest,
    ShardInfo,
    ShardStats,
} from '../models/cluster-api/index.js';
import { Logger, PresenceUrlService } from '../services/index.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');
let Logs = require('../../lang/logs.json');

export class ShardsController implements Controller {
    public path = '/shards';
    public router: Router = Router();
    public authToken: string = Config.api.secret;

    constructor(
        private shardManager: ShardingManager,
        private presenceUrlService: PresenceUrlService
    ) {}

    public register(): void {
        this.router.get('/', (req, res) => this.getShards(req, res));
        this.router.put('/presence', mapClass(SetShardPresencesRequest), (req, res) =>
            this.setShardPresences(req, res)
        );
    }

    private async getShards(req: Request, res: Response): Promise<void> {
        let shardDatas = await Promise.all(
            this.shardManager.shards.map(async shard => {
                let shardInfo: ShardInfo = {
                    id: shard.id,
                    ready: shard.ready,
                    error: false,
                };

                try {
                    let uptime = (await shard.fetchClientValue('uptime')) as number;
                    shardInfo.uptimeSecs = Math.floor(uptime / 1000);
                } catch (error) {
                    Logger.error(Logs.error.managerShardInfo, error);
                    shardInfo.error = true;
                }

                return shardInfo;
            })
        );

        let stats: ShardStats = {
            shardCount: this.shardManager.shards.size,
            uptimeSecs: Math.floor(process.uptime()),
        };

        let resBody: GetShardsResponse = {
            shards: shardDatas,
            stats,
        };
        res.status(200).json(resBody);
    }

    private async setShardPresences(req: Request, res: Response): Promise<void> {
        let reqBody: SetShardPresencesRequest = res.locals.input;
        let activityType = ActivityType[reqBody.type];

        if (activityType === ActivityType.Streaming && !reqBody.url) {
            res.status(400).json({
                error: true,
                message: 'Streaming presence requires a stream URL.',
            });
            return;
        }

        if (activityType !== ActivityType.Streaming && reqBody.url) {
            res.status(400).json({
                error: true,
                message: 'Presence URL is only supported for streaming activity.',
            });
            return;
        }

        let streamingUrl = reqBody.url
            ? await this.presenceUrlService.resolveStreamingUrl(reqBody.url)
            : undefined;
        if (streamingUrl?.type === 'none') {
            res.status(400).json({
                error: true,
                message: streamingUrl.reason,
            });
            return;
        }

        await this.shardManager.broadcastEval(
            (client, context) => {
                let customClient = client as CustomClient;
                return customClient.setPresence(context.activity, context.status);
            },
            {
                context: {
                    activity: {
                        type: activityType,
                        name: reqBody.name,
                        url: streamingUrl?.type === 'streaming' ? streamingUrl.url : undefined,
                    },
                    status: reqBody.status as PresenceStatusData,
                },
            }
        );

        res.sendStatus(200);
    }
}
