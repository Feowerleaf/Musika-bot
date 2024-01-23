const { Player } = require("shoukaku");
const f = require("../functions/player")
const g = require("../functions/reuse")


exports.characteristics = {
    category: "musical",
    global: true,
    guilds: [],
    options: [],
    type: 1
}

exports.create = {
    "name": "queue",
    "name_localizations": {"zh-TW": "待播列表"},
    "description": "Commands about queue.",
    "description_localizations": {"zh-TW": "有關待播歌曲列表的指令"},
    "options": [
        {
            "name": "clear",
            "name_localizations": {"zh-TW": "清空"},
            "description": "Clear the queue.",
            "description_localizations": {"zh-TW": "清空待播列表"},
            "type": 1
        },
        {
            "name": "remove",
            "name_localizations": {"zh-TW": "移掉"},
            "description": "Remove a track in the queue by providing its queue number.",
            "description_localizations": {"zh-TW": "移走一首歌在待播列表的歌"},
            "type": 1,
            "options": [
                {
                    "name": "queue_number",
                    "description": "Provide the number of the track for removal from the queue.",
                    "type": 4,
                    "required": true
                }
            ]
        },
        {
            "name": "show",
            "name_localizations": {"zh-TW": "顥示"},
            "description": "Show tracks in queue.",
            "description_localizations": {"zh-TW": "看看待播列表有什麼歌"},
            "type": 1
        }
    ]
}

exports.button = async (bot, interaction, inner, shoukaku) => {
    try {
        if (interaction.message.interaction.user.id != interaction.member.id) {
            let msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = "This interaction is not available for you."
            interaction.createMessage(msgobj)
            return
        }
        await interaction.acknowledge()
        if (interaction.data.custom_id.startsWith("queue show")) {
            let msgobj = g.msgobj(inner, 0)
            let page = interaction.data.custom_id.slice(11).trimEnd()
            if (isNaN(parseInt(page))) return
            if (shoukaku.players.has(interaction.guildID)){
                let player = shoukaku.players.get(interaction.guildID)
                await f.queue(parseInt(page), player, msgobj)
                await interaction.editMessage("@original", msgobj)
            } else {
                msgobj.embed.description = "It seems like nothing is being played."
                await interaction.editMessage("@original", msgobj)
            }
            return;
        }
    } catch (error) {
        console.log(error)
    }
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    if (!interaction.guildID) return;
    let msgobj = g.msgobj(inner, 0)
    if (interaction.data.options[0].name == "clear") {
        try {
            let DJ = await g.is_DJ(interaction)
            if (interaction.member.permissions.has("manageGuild") || DJ) {
                if (shoukaku.players.has(interaction.guildID)){
                    let player = shoukaku.players.get(interaction.guildID)
                    if (player.queue.length < 0) {msgobj.embed.description = "There is nothing in the queue."}
                    else {
                        let original_length = player.queue.length
                        player.queue = []
                        msgobj.embed.description = `The queue is now empty.\n${original_length} ${original_length==1?"track is":"tracks are"} removed.`
                    }
                } else {
                    msgobj.embed.description = "There is nothing in the queue."
                }
            } else {
                msgobj.embed.description = "You do not have permission to use this command in this guild"
            }
            await interaction.createMessage(msgobj)
        } catch (error) {e => console.log(e)}
    } else if (interaction.data.options[0].name == "remove") {
        try {
            let selection = interaction.data.options[0].options[0].value
            if (selection < 0) {
                msgobj.embed.description = "Negative number...? Do you have a time-turner?"
                return interaction.createMessage(msgobj);
            }
            if (selection == 0) {
                msgobj.embed.description = "Zero... Magik!"
                return interaction.createMessage(msgobj);
            }
            let DJ = await g.is_DJ(interaction)
            if (shoukaku.players.has(interaction.guildID)){
                let player = shoukaku.players.get(interaction.guildID)
                if (selection <= player?.queue.length) {
                    if (player.queue[selection-1].requestor == interaction.member.id || DJ) {
                        let removed = player.queue.splice(selection-1, 1)
                        msgobj.embed.description = `Removed [${removed[0].info.title}](${removed[0].info.uri}) which was in queue at position ${selection}.`
                        return interaction.createMessage(msgobj);
                    } else {
                        msgobj.embed.description = "The track is not requested by you."
                        return interaction.createMessage(msgobj);
                    }
                } else {
                    msgobj.embed.description = "Queue is not as long as you imagine..."
                    return interaction.createMessage(msgobj);
                }
            } else {
                msgobj.embed.description = "Queue is not as long as you imagine..."
                return interaction.createMessage(msgobj);
            }
        } catch (error) {
            console.log(error)
        }
    } else if (interaction.data.options[0].name == "show") {
        try {
            if (shoukaku.players.has(interaction.guildID)){
                let player = shoukaku.players.get(interaction.guildID)
                await f.queue(1, player, msgobj)
                await interaction.createMessage(msgobj)
            } else {
                msgobj.embed.description = "It seems like nothing is being played."
                return interaction.createMessage(msgobj);
            }
        } catch (error) {
            console.log(error)
        }
    }
}