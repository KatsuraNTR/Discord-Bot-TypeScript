import type { PresenceActivitySettings } from '../services/index.js';
import {
    ActivitiesOptions,
    ActivityType,
    Client,
    ClientOptions,
    Presence,
    PresenceStatusData,
} from 'discord.js';

export class CustomClient extends Client {
    constructor(clientOptions: ClientOptions) {
        super(clientOptions);
    }

    public setPresence(
        activity?: PresenceActivitySettings,
        status?: PresenceStatusData
    ): Presence | undefined {
        let activities = activity ? [this.buildActivity(activity)] : [];
        return this.user?.setPresence({
            activities,
            status,
        });
    }

    private buildActivity(activity: PresenceActivitySettings): ActivitiesOptions {
        if (activity.type === ActivityType.Custom) {
            return {
                type: activity.type,
                name: 'Custom Status',
                state: activity.name,
            };
        }

        return {
            type: activity.type,
            name: activity.name,
            url: activity.type === ActivityType.Streaming ? activity.url : undefined,
        } as ActivitiesOptions;
    }
}
