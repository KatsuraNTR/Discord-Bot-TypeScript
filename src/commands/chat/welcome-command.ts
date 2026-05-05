import {
    ChannelType,
    ChatInputCommandInteraction,
    GuildMember,
    PermissionsString,
    TextChannel,
} from 'discord.js';

import { GuildMemberAddHandler } from '../../events/guild-member-add-handler.js';
import { EventData } from '../../models/internal-models.js';
import { Lang, WelcomeSettingsService } from '../../services/index.js';
import { InteractionUtils, PermissionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class WelcomeEnableCommand implements Command {
    public names = ['welcome', 'enable'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        let channel =
            intr.options.getChannel(Lang.getRef('arguments.channel', data.lang), false, [
                ChannelType.GuildText,
            ]) ??
            (intr.channel instanceof TextChannel ? intr.channel : undefined);

        if (!intr.guild || !channel) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        if (!PermissionUtils.canSend(channel, true)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.welcomeMissingChannelPerms', data.lang)
            );
            return;
        }

        await this.welcomeSettingsService.update(intr.guild.id, {
            enabled: true,
            channelId: channel.id,
        });

        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.welcomeEnabled', data.lang, {
                CHANNEL: channel.toString(),
            })
        );
    }
}

export class WelcomeDisableCommand implements Command {
    public names = ['welcome', 'disable'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        await this.welcomeSettingsService.update(intr.guild.id, { enabled: false });
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.welcomeDisabled', data.lang));
    }
}

export class WelcomeStatusCommand implements Command {
    public names = ['welcome', 'status'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let settings = await this.welcomeSettingsService.get(intr.guild.id);
        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.welcomeStatus', data.lang, {
                ENABLED: Lang.getRef(`boolean.${settings.enabled}`, data.lang),
                CHANNEL: settings.channelId
                    ? `<#${settings.channelId}>`
                    : Lang.getRef('other.na', data.lang),
                MESSAGE: settings.message ?? Lang.getRef('welcome.defaultMessage', data.lang),
                IMAGE_URL: settings.imageUrl ?? Lang.getRef('other.na', data.lang),
            })
        );
    }
}

export class WelcomeMessageCommand implements Command {
    public names = ['welcome', 'message'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let message = intr.options.getString(Lang.getRef('arguments.text', data.lang), true);
        await this.welcomeSettingsService.update(intr.guild.id, { message });
        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.welcomeMessageUpdated', data.lang)
        );
    }
}

export class WelcomeImageCommand implements Command {
    public names = ['welcome', 'image'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let imageUrl = intr.options.getString(Lang.getRef('arguments.url', data.lang), true);
        await this.welcomeSettingsService.update(intr.guild.id, { imageUrl });
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.welcomeImageUpdated', data.lang));
    }
}

export class WelcomeTestCommand implements Command {
    public names = ['welcome', 'test'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private welcomeSettingsService: WelcomeSettingsService) {}

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild) {
            await InteractionUtils.send(intr, Lang.getEmbed('validationEmbeds.guildOnly', data.lang));
            return;
        }

        let member =
            intr.member instanceof GuildMember
                ? intr.member
                : await intr.guild.members.fetch(intr.user.id);
        let settings = await this.welcomeSettingsService.get(intr.guild.id);
        await InteractionUtils.send(
            intr,
            GuildMemberAddHandler.buildWelcomeEmbed(
                member,
                settings.message,
                settings.imageUrl
            )
        );
    }
}
