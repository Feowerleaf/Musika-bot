const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "setvolume",
    "name_localizations": {"zh-TW": "調音量", "zh-CN": "調音量"},
    "description": "Set the player volume.",
    "description_localizations": {"zh-TW": "調播放器的音量", "zh-CN": "調播放器的音量"},
    "options": [
        {
            "name": "volume",
            "name_localizations": {"zh-TW": "音量"},
            "description": "Volume value between 0 and 1000",
            "description_localization": {"zh-TW": "0至1000的音量"},
            "type": 4,
            "required": true
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
            if (DJ || interaction.member.permissions.has("manageGuild")) {
                msgobj.embed.footer.text = `Used by a DJ\n${msgobj.embed.footer.text}`
            } else {
                msgobj = g.msgobj(inner, 64)
                msgobj.embed.description = `This can be used by DJ only`
                return await interaction.createMessage(msgobj)
            }
            const volume = interaction.data.options[0].value
            if (volume < 0 || volume > 1000) {
                msgobj = g.msgobj(inner, 64)
                if (volume < 0) msgobj.embed.description = "did you think we use dB..."
                else msgobj.embed.description = "no, it is too loud"
                return await interaction.createMessage(msgobj)
            }
            await player.setGlobalVolume(volume)
            msgobj.embed.description = `Volume is now set to ${volume}`
        } else {
            msgobj.embed.description = "It seems like nothing is being played."
        }
        await interaction.createMessage(msgobj)
    } catch (error) {
        console.log(error)
    }
}