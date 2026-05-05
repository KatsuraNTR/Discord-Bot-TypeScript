import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export interface GuildWelcomeSettings {
    enabled: boolean;
    channelId?: string;
    message?: string;
    imageUrl?: string;
}

type WelcomeSettingsByGuild = {
    [guildId: string]: GuildWelcomeSettings;
};

export class WelcomeSettingsService {
    private filePath: string;

    constructor(filePath: string = Config.welcome?.dataFilePath ?? 'data/welcome-settings.json') {
        this.filePath = filePath;
    }

    public async get(guildId: string): Promise<GuildWelcomeSettings> {
        let settings = await this.read();
        return settings[guildId] ?? { enabled: false };
    }

    public async set(guildId: string, settings: GuildWelcomeSettings): Promise<void> {
        let allSettings = await this.read();
        allSettings[guildId] = settings;
        await this.write(allSettings);
    }

    public async update(
        guildId: string,
        patch: Partial<GuildWelcomeSettings>
    ): Promise<GuildWelcomeSettings> {
        let settings = {
            ...(await this.get(guildId)),
            ...patch,
        };
        await this.set(guildId, settings);
        return settings;
    }

    private async read(): Promise<WelcomeSettingsByGuild> {
        try {
            return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }

            throw error;
        }
    }

    private async write(settings: WelcomeSettingsByGuild): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, `${JSON.stringify(settings, undefined, 4)}\n`);
    }
}
