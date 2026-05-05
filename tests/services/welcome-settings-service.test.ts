import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WelcomeSettingsService } from '../../src/services/welcome-settings-service.js';

describe('WelcomeSettingsService', () => {
    let tempDir: string;
    let filePath: string;
    let service: WelcomeSettingsService;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'welcome-settings-'));
        filePath = path.join(tempDir, 'settings.json');
        service = new WelcomeSettingsService(filePath);
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return disabled defaults for a new guild', async () => {
        await expect(service.get('guild-1')).resolves.toEqual({ enabled: false });
    });

    it('should persist guild welcome settings', async () => {
        await service.update('guild-1', {
            enabled: true,
            channelId: 'channel-1',
            message: 'Welcome {{USER}}',
            imageUrl: 'https://example.com/welcome.gif',
        });

        await expect(service.get('guild-1')).resolves.toEqual({
            enabled: true,
            channelId: 'channel-1',
            message: 'Welcome {{USER}}',
            imageUrl: 'https://example.com/welcome.gif',
        });
    });
});
