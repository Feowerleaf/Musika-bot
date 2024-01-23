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
    "description": "Commands about album.",
    "description_localizations": {"zh-TW": "顯示此服務器的待播歌曲列表"},
    "options": [
        {
            "name": "add",
            "name_localizations": {"zh-TW": "加歌"},
            "description": "Add tracks to the queue.",
            "description_localizations": {"zh-TW": "加歌下去等待播放"},
            "type": 1,
            "options": [
                {
                    "name": "bot_playlist",
                    "name_localizations": {"zh-TW": "儲存在bot的歌單"},
                    "description": "Provide a playlist name saved using bot.",
                    "type": 3,
                    "required": false
                },
                {
                    "name": "query",
                    "name_localizations": {"zh-TW": "曲名_網址"},
                    "description": "Title of the track, or a valid link",
                    "description_localization": {"zh-TW": "歌名或者網址"},
                    "type": 3,
                    "required": false
                }
            ]
        },
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
        if (!interaction.member.voiceState.channelID) {
            let msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = "Please join in a voice channel first."
            return interaction.createFollowup(msgobj)
        }
        let msgobj = g.msgobj(inner, 0)
        if (interaction.data.custom_id.startsWith("queue add selection")) {
            let selection = parseInt(interaction.data.custom_id.slice(20).trimEnd(), 10)
            if (isNaN(selection) || (selection < 1 && selection > 5) ) {
                msgobj.flags = 64; msgobj.components = []
                msgobj.embed.description = "The button is not functioning."
                return interaction.createFollowup(msgobj)
            }
            //Play selected track
            selection--
            if (!inner.get("searchresults").has(interaction.message.interaction.id)) {
                msgobj.flags = 64; msgobj.components = []
                msgobj.embed.description = "Sorry, please search and select again."
                return await interaction.createFollowup(msgobj)
            }
            let searchmessage = inner.get("searchresults").get(interaction.message.interaction.id)
            let savedresult = searchmessage[selection]
            savedresult.requestor = interaction.member.id
            savedresult.channel = interaction.channel.id
            if (inner.get("innerqueue").has(interaction.guildID)) {
                savedresult.original = interaction.message.id
                inner.get("innerqueue").get(interaction.guildID).push(savedresult)
            } else {
                inner.get("innerqueue").set(interaction.guildID, [])
                await f.getPlayer(bot, interaction, shoukaku, inner).then(async (player) => {
                    if (player == undefined) {
                        msgobj.embed.description = "Failed to join in the voice channel.\nDoes the bot have permission to view and join the channel?"
                        msgobj.flags = 64; msgobj.components = []
                        inner.get("innerqueue").delete(interaction.guildID)
                        return interaction.createFollowup(msgobj)
                    }
                    await f.enqueue(savedresult, player)
                    msgobj.embed.description = `[${savedresult.info.title}](${savedresult.info.uri}) is placed in queue at position ${player.queue.length}.
                        Duration: ${savedresult.info.length_r}`
                    await interaction.message.edit(msgobj)
                    f.innerenqueue(inner, interaction, player, bot)
                    if (!player.track) {
                        player.track = ""
                        player.musika_lastchannel = interaction.channel.id
                        await f.play(bot, interaction, shoukaku, player, inner)
                    } else return;
                }).catch((e) => console.log(e))
            }
        } else if (interaction.data.custom_id.startsWith("queue add playlist")) {
            let selection = interaction.data.custom_id.slice(19).trimEnd()
            let savedresult = inner.get("searchresults").get(interaction.message.interaction.id)
            if (savedresult == undefined) {
                msgobj.flags = 64; msgobj.components = []
                msgobj.embed.description = "Sorry, please search and select again."
                return await interaction.createFollowup(msgobj)
            }
            if (selection == "all") {
                savedresult.data.info.selectedTrack = 0
            }
            savedresult.requestor = interaction.member.id
            savedresult.channel = interaction.channel.id
            if (inner.get("innerqueue").has(interaction.guildID)) {
                savedresult.original = interaction.message.id
                inner.get("innerqueue").get(interaction.guildID).push(savedresult)
            } else {
                inner.get("innerqueue").set(interaction.guildID, [])
                await f.getPlayer(bot, interaction, shoukaku, inner).then(async (player) => {
                    if (player == undefined) {
                        msgobj.embed.description = "Failed to join in the voice channel.\nDoes the bot have permission to view and join the channel?"
                        msgobj.flags = 64; msgobj.components = []
                        inner.get("innerqueue").delete(interaction.guildID)
                        return interaction.createFollowup(msgobj)
                    }
                    let queued = await f.enqueue(savedresult, player)
                    msgobj.embed.description = queued == 1? 
                        `${queued} track from ${savedresult.data.info.name} is placed in queue.`:`${queued} tracks from ${savedresult.data.info.name} are placed in queue.`
                    await interaction.editMessage("@original", msgobj)
                    f.innerenqueue(inner, interaction, player, bot)
                    if (!player.track) {
                        player.track = ""
                        player.musika_lastchannel = interaction.channel.id
                        await f.play(bot, interaction, shoukaku, player, inner)
                    } else return;
                }).catch((e) => console.log(e))
            }
        }
    } catch (error) {
        console.log(error)
    }
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    if (!interaction.guildID) return;
    let msgobj = g.msgobj(inner, 0)
    if (interaction.data.options[0].name == "add") {
        try {
            await interaction.acknowledge()
            if ( "options" in interaction.data.options[0]) {
                if (interaction.data.options[0].options.length == 1) {
                    switch (interaction.data.options[0].options[0]?.name) {
                        case "bot_playlist":
                            msgobj.embed.description = `This function is still under implementation.`
                            return interaction.createMessage(msgobj);
                        case "query":
                            let results = typeof Object
                            if (g.add_http(interaction.data.options[0].options[0].value) == "") {
                                results = await f.search(searchNode, "ytsearch", interaction.data.options[0].options[0].value).catch(e =>{
                                    console.log(e)
                                    msgobj.embed.description = "Cannot connect to Lavalink server."
                                })
                            } else {
                                results = await searchNode.rest.resolve(`${interaction.data.options[0].options[0].value}`).catch(e => {
                                    console.log(e)
                                    msgobj.embed.description = "Cannot connect to Lavalink server."
                                    return interaction.createMessage(msgobj);
                                })
                            }
                            if (results.loadType == "empty" || results.loadType == "error") {
                                msgobj.embed.description = "If you gave a valid link, please search again and hope for miracle...\nOh yeah, feeding a YouTube identifer may give back nothing."
                                return interaction.createMessage(msgobj);
                            }
                            if (results.loadType == "search") {
                                if (results.data.length > 0) {
                                    await f.result_msg(bot, interaction, msgobj, results, inner)
                                }
                            } else if (results.loadType == "playlist") {
                                if (!await f.voiceChannelCheck(interaction, msgobj)) return;
                                results.channel = interaction.channel.id
                                results.requestor = interaction.member.id
                                if (results.data.info.selectedTrack != -1) {
                                    msgobj.embed.title = `The playlist contains ${results.data.tracks.length} ${results.data.tracks.length==1? "track":"tracks"}.`
                                    msgobj.embed.description = "Which of the following do you prefer?"
                                    msgobj.components.unshift({"type": 1, 
                                        "components": [{"type": 2, "style": 1, "label": "Play all", "custom_id": "queue add playlist all"}, 
                                            {"type": 2, "style": 1, "label": `Play from track ${results.data.info.selectedTrack+1}`, "custom_id": "queue add playlist selected"}]
                                    })
                                    inner.get("searchresults").set(interaction.id, results)
                                    await interaction.createFollowup(msgobj).id
                                } else {
                                    results.data.info.selectedTrack = 0
                                    if (inner.get("innerqueue").has(interaction.guildID)) {
                                        results.iAID = interaction.applicationID
                                        results.iToken = interaction.token
                                        inner.get("innerqueue").get(interaction.guildID).push(results)
                                    } else {
                                        inner.get("innerqueue").set(interaction.guildID, [])
                                        await f.getPlayer(bot, interaction, shoukaku, inner).then(async (player) => {
                                            if (player == undefined) {
                                                msgobj.embed.description = "Failed to join in the voice channel.\nDoes the bot have permission to view and join the channel?"
                                                inner.get("innerqueue").delete(interaction.guildID)
                                                return interaction.createFollowup(msgobj)
                                            }
                                            let queued = await f.enqueue(results, player)
                                            msgobj.embed.description = queued == 1? 
                                                `${queued} track from ${results.data.info.name} is placed in queue.`:`${queued} tracks from ${results.data.info.name} are placed in queue.`
                                            await interaction.createFollowup(msgobj)
                                            f.innerenqueue(inner, interaction, player, bot)
                                            if (!player.track) {
                                                player.track = ""
                                                player.musika_lastchannel = interaction.channel.id
                                                await f.play(bot, interaction, shoukaku, player, inner)
                                            } else return;
                                        }).catch((e) => {
                                            console.log(e)
                                        })
                                    }
                                }
                            } else if (results.loadType == "track") {
                                if (!await f.voiceChannelCheck(interaction, msgobj)) return;
                                let track = results.data
                                track.requestor = interaction.member.id
                                track.channel = interaction.channel.id
                                track.info.length_r = track.info.isStream? "Unpredictable duration as it is a live":g.readable_duration(track.info.length)
                                if (inner.get("innerqueue").has(interaction.guildID)) {
                                    track.iAID = interaction.applicationID
                                    track.iToken = interaction.token
                                    inner.get("innerqueue").get(interaction.guildID).push(track)
                                } else {
                                    inner.get("innerqueue").set(interaction.guildID, [])
                                    await f.getPlayer(bot, interaction, shoukaku, inner).then(async (player) => {
                                        if (player == undefined) {
                                            msgobj.embed.description = "Failed to join in the voice channel.\nDoes the bot have permission to view and join the channel?"
                                            inner.get("innerqueue").delete(interaction.guildID)
                                            return interaction.createFollowup(msgobj)
                                        }
                                        await f.enqueue(track, player)
                                        msgobj.embed.description = `[${track.info.title}](${track.info.uri}) is placed in queue at position ${player.queue.length}.
                                            Duration: ${track.info.length_r}`
                                        f.innerenqueue(inner, interaction, player, bot)
                                        await interaction.createFollowup(msgobj)
                                        if (!player.track) {
                                            player.track = ""
                                            player.musika_lastchannel = interaction.channel.id
                                            await f.play(bot, interaction, shoukaku, player, inner)
                                        } else return;
                                    }).catch((e) => console.log(e))
                                }
                            }
                            break;
                        default:
                            break;
                    }
                } else {
                    msgobj.embed.description = `Please fill in either field ${interaction.data.options[0].options.length == 2?"only":""}.`
                    //msgobj.flags = 64; msgobj.components = []
                    return await interaction.createFollowup(msgobj);
                }
            } else {
                //resume
            }
        } catch (error) {
            console.log(error)
        }
    } else if (interaction.data.options[0].name == "clear") {
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