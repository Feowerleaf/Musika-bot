const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "resume",
    "name_localizations": {"zh-TW": "繼續播放", "zh-CN": "繼續播放"},
    "description": "Resume playing.",
    "description_localizations": {"zh-TW": "繼續播放", "zh-CN": "繼續播放"}
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    if (!interaction.guildID) return;
    try {
        let msgobj = g.msgobj(inner, 0)
        let DJ = await g.is_DJ(interaction) | interaction.member.permissions.has("manageGuild")
        if (shoukaku.players.has(interaction.guildID)){
            let the_bot_itself = await bot.getSelf()
            let channel = interaction.member?.voiceState?.channelID != null ? bot.getChannel(interaction.member.voiceState.channelID): ""
            if (channel != "" && channel.voiceMembers.has(the_bot_itself.id)) {
                let player = shoukaku.players.get(interaction.guildID)
                if (channel.voiceMembers.size > 2 && !DJ) {
                    if (player.paused == 0) {
                        msgobj = g.msgobj(inner, 64)
                        msgobj.embed.description = "Player is not paused."
                    }
                    else msgobj.embed.description = "Please ask a DJ to resume the session.\nYou can also use this when you are left alone."
                } else {
                    if (player.paused == 1) {
                        await shoukaku.players.get(interaction.guildID).setPaused(false);
                        delete shoukaku.players.get(interaction.guildID).alonePause
                        msgobj.embed.description = "Player has now resumed."
                    } else {
                        msgobj = g.msgobj(inner, 64)
                        msgobj.embed.description = "Player is not paused."
                    }                    
                    if (!DJ) msgobj.embed.description += "\nYou can use this as only you are listening in. \nt will resume once others join."
                }
            } else {
                msgobj = g.msgobj(inner, 64)
                msgobj.embed.description = "You can only use this while we are staying in same voice channel."
            }
        } else {
            msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = "It seems like the bot is not playing anything."
        }
        await interaction.createMessage(msgobj)
    } catch (error) {
        console.log(error)
    }
}