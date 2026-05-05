import { Channel, EmbedBuilder, GuildMember, TextBasedChannel } from 'discord.js';
import { createRequire } from 'node:module';

import { EventHandler } from './index.js';
import { EventDataService, Lang, Logger, WelcomeSettingsService } from '../services/index.js';
import { ClientUtils, MessageUtils, PermissionUtils } from '../utils/index.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');
let Logs = require('../../lang/logs.json');

export class GuildMemberAddHandler implements EventHandler {
    constructor(
        private eventDataService: EventDataService,
        private welcomeSettingsService: WelcomeSettingsService
    ) {}

    public async process(member: GuildMember): Promise<void> {
        if (Config.welcome?.ignoreBots && member.user.bot) {
            return;
        }

        let settings = await this.welcomeSettingsService.get(member.guild.id);
        if (!settings.enabled) {
            return;
        }

        let data = await this.eventDataService.create({
            user: member.user,
            guild: member.guild,
        });

        let channel = settings.channelId
            ? await member.guild.channels.fetch(settings.channelId)
            : await ClientUtils.findNotifyChannel(member.guild, data.langGuild);

        if (!channel?.isTextBased() || !PermissionUtils.canSend(channel as Channel, true)) {
            Logger.warn(
                Logs.warn.memberWelcomeNoChannel
                    .replaceAll('{GUILD_NAME}', member.guild.name)
                    .replaceAll('{GUILD_ID}', member.guild.id)
            );
            return;
        }

        await MessageUtils.send(
            channel as TextBasedChannel,
            GuildMemberAddHandler.buildWelcomeEmbed(member, settings.message, settings.imageUrl)
        );
    }

    public static buildWelcomeEmbed(
        member: GuildMember,
        message?: string,
        imageUrl?: string
    ): EmbedBuilder {
        let embed = Lang.getEmbed('displayEmbeds.memberWelcome', member.guild.preferredLocale, {
            USER: member.toString(),
            USERNAME: member.user.username,
            DISPLAY_NAME: member.displayName,
            SERVER: member.guild.name,
            MEMBER_COUNT: member.guild.memberCount?.toLocaleString(member.guild.preferredLocale),
            MESSAGE: GuildMemberAddHandler.renderMessage(
                message ??
                    Config.welcome?.defaultMessage ??
                    Lang.getRef('welcome.defaultMessage', member.guild.preferredLocale),
                member
            ),
        })
            .setAuthor({
                name: member.guild.name,
                iconURL: member.guild.iconURL(),
            })
            .setThumbnail(member.user.displayAvatarURL());

        let resolvedImageUrl = imageUrl ?? Config.welcome?.defaultImageUrl;
        if (resolvedImageUrl) {
            embed.setImage(resolvedImageUrl);
        }

        return embed;
    }

    public static renderMessage(message: string, member: GuildMember): string {
        return message
            .replaceAll('{{USER}}', member.toString())
            .replaceAll('{{USERNAME}}', member.user.username)
            .replaceAll('{{DISPLAY_NAME}}', member.displayName)
            .replaceAll('{{SERVER}}', member.guild.name)
            .replaceAll('{{MEMBER_COUNT}}', member.guild.memberCount?.toLocaleString() ?? '0');
    }
}
