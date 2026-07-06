import { ActivityType, ShardingManager } from 'discord.js';
import { createRequire } from 'node:module';

import { Job } from './index.js';
import { CustomClient } from '../extensions/index.js';
import { BotSite } from '../models/config-models.js';
import { HttpService, Lang, Logger, PresenceSettingsService } from '../services/index.js';
import { ShardUtils } from '../utils/index.js';

const require = createRequire(import.meta.url);
let BotSites: BotSite[] = require('../../config/bot-sites.json');
let Config = require('../../config/config.json');
let Logs = require('../../lang/logs.json');

export class UpdateServerCountJob extends Job {
    public name = 'Update Server Count';
    public schedule: string = Config.jobs.updateServerCount.schedule;
    public log: boolean = Config.jobs.updateServerCount.log;
    public runOnce: boolean = Config.jobs.updateServerCount.runOnce;
    public initialDelaySecs: number = Config.jobs.updateServerCount.initialDelaySecs;

    private botSites: BotSite[];

    constructor(
        private shardManager: ShardingManager,
        private httpService: HttpService,
        private presenceSettingsService: PresenceSettingsService
    ) {
        super();
        this.botSites = BotSites.filter(botSite => botSite.enabled);
    }

    public async run(): Promise<void> {
        let presenceSettings = await this.presenceSettingsService.get();
        let serverCount = await ShardUtils.serverCount(this.shardManager);

        if (presenceSettings.mode === 'manual' && presenceSettings.activity) {
            await this.shardManager.broadcastEval(
                (client, context) => {
                    let customClient = client as CustomClient;
                    return customClient.setPresence(context.activity, context.status);
                },
                {
                    context: {
                        activity: presenceSettings.activity,
                        status: presenceSettings.status,
                    },
                }
            );
        } else {
            let activity = {
                type: ActivityType.Streaming,
                name: `to ${serverCount.toLocaleString()} servers`,
                url: Lang.getCom('links.stream'),
            };

            await this.shardManager.broadcastEval(
                (client, context) => {
                    let customClient = client as CustomClient;
                    return customClient.setPresence(context.activity);
                },
                { context: { activity } }
            );
        }

        Logger.info(
            Logs.info.updatedServerCount.replaceAll('{SERVER_COUNT}', serverCount.toLocaleString())
        );

        for (let botSite of this.botSites) {
            try {
                let body = JSON.parse(
                    botSite.body.replaceAll('{{SERVER_COUNT}}', serverCount.toString())
                );
                let res = await this.httpService.post(botSite.url, botSite.authorization, body);

                if (!res.ok) {
                    throw res;
                }
            } catch (error) {
                Logger.error(
                    Logs.error.updatedServerCountSite.replaceAll('{BOT_SITE}', botSite.name),
                    error
                );
                continue;
            }

            Logger.info(Logs.info.updatedServerCountSite.replaceAll('{BOT_SITE}', botSite.name));
        }
    }
}
