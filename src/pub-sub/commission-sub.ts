import {Client, Message, MessageEmbed, MessageOptions, TextChannel} from 'discord.js'
import {CacheService} from "../core/cache-service";

export class CommissionSub {

    private static CHANNELS: Record<string, string> = {
        elemental: '782287155376291860',
        mana: '782287221545631745',
        gaia: '782287171004006431',
        aether: '782287040737050635',
        primal: '782287253098856469',
        crystal: '782287132945285120',
        chaos: '782214649281642496',
        light: '782287186585452596',
        猫小胖: '782287293712302081',
        莫古力: '782287319221796865',
        陆行鸟: '782287342563098646',
        korea: '782635554259861530',
        test: '784327491292102667'
    }

    private cache = CacheService.INSTANCE;

    constructor(private client: Client, private itemNames: Record<number, { en: string }>) {
    }

    public commissionCreated(commission: any): void {
        if (commission.totalItems > 0 && this.cache.getItem(commission.$key) === undefined) {
            this.addMessage(commission);
        }
    }

    public commissionUpdated(commission: any): void {
        const messageId = this.cache.getItem(commission.$key);
        if (commission.totalItems > 0 && !messageId && commission.status === 0) {
            this.addMessage(commission);
        } else if (messageId) {
            const channel = this.getChannel(commission);
            if (channel) {
                channel.messages.fetch(messageId).then(message => {
                    switch (commission.status) {
                        case 0:
                            message.edit(this.getEmbed(commission));
                            break;
                        case 1:
                            message.delete({reason: 'Linked commission has been started'}).then(() => {
                                this.cache.deleteItem(commission.$key);
                            });
                            break;
                        case 2:
                            message.delete({reason: 'Linked commission has been archived'}).then(() => {
                                this.cache.deleteItem(commission.$key);
                            });
                            break;
                    }
                }).catch(e => console.warn(e));
            }
        }
    }

    public commissionDeleted(commission: any): void {
        const messageId = this.cache.getItem(commission.$key);
        const channel = this.getChannel(commission);
        if (messageId && channel) {
            channel.messages.fetch(messageId).then(message => {
                message.delete({reason: 'Linked commission was deleted'}).then(() => {
                    this.cache.deleteItem(commission.$key);
                });
            }).catch(e => console.warn(e))
        }
    }

    private addMessage(commission: any): void {
        const channel = this.getChannel(commission);
        if (channel) {
            channel.send(this.getEmbed(commission)).then((message: Message) => {
                this.cache.setItem(commission.$key, message.id);
            }).catch(e => console.error(e));
        }
    }

    private getChannel(commission: any): TextChannel | undefined {
        if (commission.datacenter) {
            return this.client.channels.cache.get(CommissionSub.CHANNELS[commission.datacenter.toLowerCase()]) as TextChannel;
        }
        return undefined;
    }

    private getEmbed(commission: any): MessageOptions {
        let price = commission.price;
        if (price <= 0) {
            price = 'To be discussed';
        } else {
            price = price.toLocaleString('en-US');
        }
        const items = commission.items
            .map(item => ({...item, name: this.itemNames[item.id]}))
            .filter(item => item.amount - item.done > 0 && item.name !== undefined)
            .map(item => ` - **${item.name.en}** x${item.amount - item.done}`)
            .join('\n');
        return {
            content: '<@&786319001620840492>',
            embed: new MessageEmbed()
                .setTitle(commission.name || 'No name')
                .setURL(`https://ffxivteamcraft.com/commission/${commission.$key}`)
                .setDescription(`**Items (${items.length})**
                ${items.length > 0 ? items : 'No items yet'}
                `)
                .addField('Server', commission.server || 'Unknown server', true)
                .addField('Payment', price, true)
                .addField('Has all materials', (commission.includesMaterials || false).toString(), true)
                .addField('Tags', commission.tags.length > 0 ? commission.tags.join(', ') : 'No tags', true)
                .addField('Description', commission.description || 'No description')
                .setFooter(
                    "ffxiv-teamcraft",
                    "https://ffxivteamcraft.com/assets/logo.png"
                )
                .setColor("#4880b1")
        };
    }

}
