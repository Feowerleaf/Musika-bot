const fs = require("fs")
const g = require("../functions/reuse")

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.create = {
    "name": "loop",
    "name_localizations": {"zh-TW": "循環播放", "zh-CN": "循環播放"},
    "description": "On-off command of repeat mode.",
    "description_localizations": {"zh-TW": "啟動或停用循環播放", "zh-CN": "啟動或停用循環播放"},
    "options": [
        {
            "name": "mode",
            "name_localizations": {"zh-TW": "模式", "zh-CN": "模式"},
            "description": "Player repeat mode.",
            "description_localizations": {"zh-TW": "循環播放模式", "zh-CN": "循環播放模式"},
            "type": 3,
            "required": true,
            "choices": [
                {
                    "name": "none",
                    "name_localizations": {"zh-TW": "無", "zh-CN": "無"},
                    "value": "none"
                },
                {
                    "name": "queue",
                    "name_localizations": {"zh-TW": "候播列表", "zh-CN": "候播列表"},
                    "value": "queue"
                },
                {
                    "name": "current track",
                    "name_localizations": {"zh-TW": "此單曲", "zh-CN": "此單曲"},
                    "value": "current track"
                }
            ]
        },
        {
            "name": "save_setting",
            "name_localizations": {"zh-TW": "存不存設定", "zh-CN": "存不存設定"},
            "description": "Save setting in this server.",
            "description_localizations": {"zh-TW": "..."},
            "type": 3,
            "required": false,
            "choices": [
                {
                    "name": "yes",
                    "name_localizations": {"zh-TW": "存", "zh-CN": "存"},
                    "value": "save"
                },
                {
                    "name": "no",
                    "name_localizations": {"zh-TW": "不存", "zh-CN": "不存"},
                    "value": "dontsave"
                }
            ]
        }
    ]
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    try {
        if (!interaction.guildID) return;

        let new_mode, save_option
        interaction.data.options.forEach(async option => {
            switch (option.name) {
                case "mode":
                    new_mode = option.value
                    break;
                case "save_setting":
                    save_option = option.value
                    break;
            }
        });
        if (save_option == null) save_option = "dontsave"

        let msgobj = g.msgobj(inner, 0)
        msgobj.embed.description = ""
        let DJ = await g.is_DJ(interaction)
        if (interaction.member.permissions.has("manageGuild") || DJ) {
            DJ = true;
            if (save_option == "save") {
                let guildJSON = {}
                if (fs.existsSync(`./data/guild/Guild_${interaction.guildID}.json`)) {
                    guildJSON = JSON.parse(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`))
                } else {
                    guildJSON.id = interaction.guildID
                }
                guildJSON.loop_mode = new_mode
                fs.writeFileSync(`./data/guild/Guild_${interaction.guildID}.json`, JSON.stringify(guildJSON, null, 2), err => {
                    if (err) {
                        console.log(err);
                    }
                })
                msgobj.embed.description = `Repeat mode in this server is saved as **${new_mode}**\n`
            }
        }

        if (shoukaku.players.has(interaction.guildID)){
            let the_bot_itself = await bot.getSelf()
            let channel = interaction.member?.voiceState?.channelID != null ? bot.getChannel(interaction.member.voiceState.channelID): ""
            if (channel != "" && channel.voiceMembers.has(the_bot_itself.id)) {
                if (channel.voiceMembers.size > 2 && !DJ ) {
                    msgobj.embed.description = "You cannot use this when listening with other server members."
                } else {
                    let player = shoukaku.players.get(interaction.guildID)
                    switch(new_mode) {
                        case "none":
                            player.loop_mode = "none"
                        break
                        case "queue":
                            player.loop_mode = "queue"
                        break
                        case "current track":
                            player.loop_mode = "current track"
                            let status_msg = JSON.parse(JSON.stringify(player.playing.end_msg))
                            status_msg.embed.title = "Looping"
                            await bot.editMessage(player.playing.channel, player.playing.play_msgid, status_msg).catch(e => {})
                        break
                    }
                    msgobj.embed.description += `Repeat mode for this session is set to **${new_mode}**`
                    if (!DJ) msgobj.embed.description += "\nYou can use this while you are listening alone."
                }
            } else {
                let msgobj_64 = g.msgobj(inner, 64)
                msgobj_64.embed.description = msgobj.embed.description
                msgobj = msgobj_64
                if (!DJ || save_option == "dontsave") msgobj.embed.description = "You can only use this while we are staying in a same voice channel."
                else msgobj.embed.description += "\nThis does not take effect immediately unless you join the same voice channel."
            }
        } else {
            if (save_option == "dontsave") {
                let msgobj_64 = g.msgobj(inner, 64)
                msgobj_64.embed.description = msgobj.embed.description
                msgobj = msgobj_64
                msgobj.embed.description = "It seems like nothing is being played."
            }
        }

        await interaction.createMessage(msgobj)
    } catch (error) {
        console.log(error)
    }
}