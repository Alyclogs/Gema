import { ClientEvents } from "discord.js";
import Bot from '../lib/Bot'

export class Event<Key extends keyof ClientEvents> {
    constructor(
        public data: EventOptions<Key>,
        public run: (client: Bot, ...args: any[]) => any
    ) { }
}

interface EventOptions<Key extends keyof ClientEvents> {
    name: Key
    once: boolean
}
