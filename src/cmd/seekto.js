const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "seekto",
    "name_localizations": {"zh-TW": "跳至", "zh-CN": "跳至"},
    "description": "Seek to a specific time of the playing track.",
    "description_localizations": {"zh-TW": "跳到現下曲目的特定時間點", "zh-CN": "跳到現下曲目的特定時間點"},
    "options": [
        {
            "name": "hour",
            "name_localizations": {"zh-TW": "時"},
            "description": "Hour value of time to seek to",
            "description_localization": {"zh-TW": "跳去播放時間點的時"},
            "type": 4,
            "required": false
        },
        {
            "name": "minute",
            "name_localizations": {"zh-TW": "分"},
            "description": "Minute value of time to seek to",
            "description_localization": {"zh-TW": "跳去播放時間的分"},
            "type": 4,
            "required": false
        },
        {
            "name": "second",
            "name_localizations": {"zh-TW": "秒"},
            "description": "Second value of time to seek to",
            "description_localization": {"zh-TW": "跳去播放時間的秒"},
            "type": 4,
            "required": false
        }
    ]
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    try {
        if (!interaction.guildID) return;
        if (!interaction.data.options) return;
        let msgobj = g.msgobj(inner, 0)
        if (shoukaku.players.has(interaction.guildID)){
            let player = shoukaku.players.get(interaction.guildID)
            let DJ = await g.is_DJ(interaction)
            if (player.playing.requestor == interaction.member.id) { 
                msgobj.embed.footer.text = `${msgobj.embed.footer.text}`
            } else if (DJ || interaction.member.permissions.has("manageGuild")) {
                msgobj.embed.footer.text = `Used by a DJ\n${msgobj.embed.footer.text}`
            }
            else {
                let voiceChannel = bot.getChannel(shoukaku.connections.get(interaction.guildID).channelId)
                if (voiceChannel.voiceMembers.size == 2 && voiceChannel.voiceMembers.has(interaction.member.id)) {
                    msgobj.embed.footer.text = `Seek to the location as you wish, happy!\n${msgobj.embed.footer.text}`
                } else {
                    msgobj.embed.description = `"${player.playing.info.title}" was not requested by you, so you cannot use this now.`
                    await interaction.createMessage(msgobj)
                    return
                }
            }
            const data_opt_obj = {}
            interaction.data.options.forEach(element => {
                data_opt_obj[element.name] = element
            })
            const hour = data_opt_obj.hour? data_opt_obj.hour.value:0
            const min = data_opt_obj.minute? data_opt_obj.minute.value:0
            const sec = data_opt_obj.second? data_opt_obj.second.value:0
            const seekto = g.duration(hour, min, sec)
            const seekto_readable = g.readable_duration(seekto)
            if (player.playing.info.isStream) {
                msgobj.embed.title = "You cannot seek to a specific time of a stream."
                msgobj.embed.description = "Skip it instead?"
                return interaction.createMessage(msgobj)
            }
            if (seekto < player.playing.info.length-2500) {
                await player.seekTo(seekto).then(async () => {
                    msgobj.embed.title = `Seek to ${seekto_readable}`
                    return await interaction.createMessage(msgobj)
                }).catch(async ()=> {
                    msgobj.embed.title = `Fail to seek to ${seekto_readable}`
                    await interaction.createMessage(msgobj)
                })
            } else {
                if (seekto > player.playing.info.length) msgobj.embed.title = "The track is not that long."
                if (seekto <= player.playing.info.length) {
                    msgobj.embed.title = "It is almost the end of the track."
                    msgobj.embed.description = "Please choose an earlier time."
                }
                await interaction.createMessage(msgobj)
            }
        } else {
            msgobj.embed.description = "It seems like nothing is being played."
            await interaction.createMessage(msgobj)
        }
    } catch (error) {
        console.log(error)
    }
}