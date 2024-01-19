const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "leavevoicechannel",
    "name_localizations": {"zh-TW": "退出語音頻道", "zh-CN": "退出語音頻道"},
    "description": "Ask the bot to leave the voice channel it is in.",
    "description_localizations": {"zh-TW": "讓 bot 離開所在的語音頻道", "zh-CN": "讓 bot 離開所在的語音頻道"}
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
                if (channel.voiceMembers.size > 2 && !DJ) {
                    msgobj.embed.description = "You cannot use this when listening with other server members."
                } else {
                    await shoukaku.leaveVoiceChannel(interaction.guildID)
                    msgobj.embed.description = "Successfully left the voice channel. Player in this guild is reset.\n"
                    if (!DJ) msgobj.embed.description += "\nYou can use this as only you are listening in."
                }
            } else {
                msgobj = g.msgobj(inner, 64)
                msgobj.embed.description = "You can only use this while we are staying in same voice channel."
            }
        } else {
            if (shoukaku.connections.has(interaction.guildID)) {
                await shoukaku.leaveVoiceChannel(interaction.guildID)
                msgobj.embed.description = "Successfully left the voice channel. Player in this guild is reset.\n"
                if (!DJ) msgobj.embed.description += "\nYou can use this while you are listening in alone."
            } else {
                msgobj = g.msgobj(inner, 64)
                msgobj.embed.description = "It seems like the bot is not playing anything."
            }
        }
        await interaction.createMessage(msgobj)
    } catch (error) {
        console.log(error)
    }
}