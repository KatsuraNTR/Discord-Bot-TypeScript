import { ActivityType, PresenceStatusData } from 'discord.js';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export type PresenceMode = 'server-count' | 'manual';

export interface PresenceActivitySettings {
    type: ActivityType;
    name: string;
    url?: string;
    urlSource?: string;
}

export interface PresenceSettings {
    mode: PresenceMode;
    activity?: PresenceActivitySettings;
    status?: PresenceStatusData;
}

export class PresenceSettingsService {
    private filePath: string;

    constructor(filePath: string = Config.presence?.dataFilePath ?? 'data/presence-settings.json') {
        this.filePath = filePath;
    }

    public async get(): Promise<PresenceSettings> {
        try {
            return {
                mode: 'server-count',
                ...JSON.parse(await fs.readFile(this.filePath, 'utf8')),
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { mode: 'server-count' };
            }

            throw error;
        }
    }

    public async set(settings: PresenceSettings): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, `${JSON.stringify(settings, undefined, 4)}\n`);
    }

    public async setManual(
        activity: PresenceActivitySettings,
        status?: PresenceStatusData
    ): Promise<void> {
        await this.set({
            mode: 'manual',
            activity,
            status,
        });
    }

    public async setServerCount(): Promise<void> {
        await this.set({ mode: 'server-count' });
    }
}
