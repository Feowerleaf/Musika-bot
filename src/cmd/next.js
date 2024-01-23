const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "next",
    "name_localizations": {"zh-TW": "下一首", "zh-CN": "下一首"},
    "description": "Stop current track and play next track in the queue.",
    "description_localizations": {"zh-TW": "停播現下的曲目, 並切換至下一首", "zh-CN": "停播現下的曲目, 並切換至下一首"}
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    try {
        if (!interaction.guildID) return;
        let msgobj = g.msgobj(inner, 0)
        if (shoukaku.players.has(interaction.guildID)){
            let player = shoukaku.players.get(interaction.guildID)
            let DJ = await g.is_DJ(interaction)
            if (player.playing.requestor == interaction.member.id) { 
                msgobj.embed.footer.text = `Track requestor skipped it...\n${msgobj.embed.footer.text}`
            } else if (DJ) {
                msgobj.embed.footer.text = `Track is skipped by DJ...\n${msgobj.embed.footer.text}`
            }
            else {
                let voiceChannel = bot.getChannel(shoukaku.connections.get(interaction.guildID).channelId)
                if (voiceChannel.voiceMembers.size == 2 && voiceChannel.voiceMembers.has(interaction.member.id)) {
                    msgobj.embed.footer.text = `Skipped as you wish, the lonely listener...\n${msgobj.embed.footer.text}`
                } else {
                    msgobj.embed.description = `"${player.playing.info.title}" was not requested by you, and you cannot skip it.`
                    await interaction.createMessage(msgobj)
                    return
                }
            }
            msgobj.embed.title = `Skipped ${player.playing.info.title}`
            if (player.queue.length == 0) msgobj.embed.description += "Playing next track now...\nBut where is the next track?"
            player.playing.end_msg.embed.title = "Skipped..."
            await player.stopTrack().then(async () => {
                return interaction.createMessage(msgobj)
            })
        } else {
            msgobj.embed.description = "It seems like nothing is being played."
            await interaction.createMessage(msgobj)
        }
    } catch (error) {
        console.log(error)
    }
}