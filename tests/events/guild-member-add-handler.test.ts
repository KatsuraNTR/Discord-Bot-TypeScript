import { Locale, resolveColor } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { GuildMemberAddHandler } from '../../src/events/guild-member-add-handler.js';
import {
    guildBuilderFactory,
    guildMemberBuilder,
    textChannelBuilder,
} from '../builders/discord-builders.js';
import { mockProp } from '../helpers/index.js';

describe('GuildMemberAddHandler', () => {
    describe('renderMessage', () => {
        it('should replace supported welcome placeholders', () => {
            let guild = guildBuilderFactory().withName('Test Guild').build();
            mockProp(guild, 'memberCount', 42);
            let member = guildMemberBuilder('user-1')
                .withGuild(guild)
                .withDisplayName('Display Name')
                .build();

            expect(
                GuildMemberAddHandler.renderMessage(
                    'Hi {{USER}} {{USERNAME}} {{DISPLAY_NAME}} {{SERVER}} {{MEMBER_COUNT}}',
                    member
                )
            ).toBe('Hi <@user-1> username-user-1 Display Name Test Guild 42');
        });
    });

    describe('buildWelcomeEmbed', () => {
        it('should build a welcome embed with custom message and image', () => {
            let guild = guildBuilderFactory().withName('Test Guild').build();
            mockProp(guild, 'memberCount', 42);
            mockProp(guild, 'preferredLocale', Locale.EnglishUS);
            let member = guildMemberBuilder('user-1').withGuild(guild).build();

            let embed = GuildMemberAddHandler.buildWelcomeEmbed(
                member,
                'Welcome {{USER}}!',
                'https://example.com/welcome.gif'
            );

            expect(embed.data.title).toBe('Welcome to Test Guild!');
            expect(embed.data.description).toBe('Welcome <@user-1>!');
            expect(embed.data.color).toBe(resolveColor('#bdadf6'));
            expect(embed.data.image?.url).toBe('https://example.com/welcome.gif');
        });
    });

    describe('process', () => {
        it('should send real welcome messages as normal channel messages', async () => {
            let guild = guildBuilderFactory().withName('Test Guild').build();
            mockProp(guild, 'memberCount', 42);
            mockProp(guild, 'preferredLocale', Locale.EnglishUS);

            let channel = textChannelBuilder()
                .withId('welcome-channel')
                .withGuild(guild)
                .asGuildChannel()
                .build();
            channel.isTextBased = vi.fn().mockReturnValue(true);
            guild.channels.fetch = vi.fn().mockResolvedValue(channel) as any;

            let member = guildMemberBuilder('user-1').withGuild(guild).build();
            let welcomeSettingsService = {
                get: vi.fn().mockResolvedValue({
                    enabled: true,
                    channelId: 'welcome-channel',
                    message: 'Welcome {{USER}}!',
                    imageUrl: undefined,
                }),
            };
            let eventDataService = {
                create: vi.fn().mockResolvedValue({ langGuild: Locale.EnglishUS }),
            };

            await new GuildMemberAddHandler(
                eventDataService as any,
                welcomeSettingsService as any
            ).process(member);

            expect(channel.send).toHaveBeenCalledTimes(1);
            let sentOptions = channel.send.mock.calls[0][0];
            expect(sentOptions).toHaveProperty('embeds');
            expect(sentOptions).not.toHaveProperty('flags');
        });
    });
});
