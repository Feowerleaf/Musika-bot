const { Player } = require("shoukaku");
const fs = require("fs")
const g = require("./reuse")
module.exports = {
    enqueue: async function(item, player) {
        if (item.encoded == null) {
            for (n = item.data.info.selectedTrack; n < item.data.tracks.length; n++) {
                if (item.data.tracks[n].info.title == "") {
                    let title = item.data.tracks[n].info.uri.split("/")
                    item.data.tracks[n].info.title = title[title.length-1]
                }
                item.data.tracks[n].requestor = item.requestor
                item.data.tracks[n].channel = item.channel
                item.data.tracks[n].info.length_r = item.data.tracks[n].info.isStream? "Unpredictable as it is a live":g.readable_duration(item.data.tracks[n].info.length)
                player.queue.push(item.data.tracks[n])
            }
            return item.data.tracks.length - item.data.info.selectedTrack
        } else {
            if (item.info.title == "") {
                let title = item.info.uri.split("/")
                item.info.title = title[title.length-1]
            }
            player.queue.push(item)
            return -1
        }
    },
    getPlayer: async function (bot, i, shoukaku, inner) {
        if (shoukaku.nodes.size == 0) await shoukaku.addNode(inner.get("configurations").nodes[0])
        let player;
        try {
            if (shoukaku.connections.has(i.guildID)){
                if (!shoukaku.players.has(i.guildID)) {
                    shoukaku.players.set(i.guildID, shoukaku.frozen_players.get(i.guildID))
                    shoukaku.frozen_players.delete(i.guildID)
                }
                return shoukaku.players.get(i.guildID)
            } else {
                let node = {
                    guildId: i.member.guild.id,
                    channelId: i.member.voiceState.channelID,
                    shardId: 0
                }
                player = await shoukaku.joinVoiceChannel(node).catch(async err => {
                    await shoukaku.leaveVoiceChannel(i.member.guild.id)
                    console.log("Error at line 49 player")
                    return
                });
                player.on("exception", async () => {
                    if (player.playing) {
                        player.playing.end_msg.embed.title = "Exception event occurred while playing"
                        player.playing.end_msg.embed.description = "The service failed to play the track. It has been stopped and skipped.\n\n" + exc_msg.embed.description
                        await bot.editMessage(player.playing.channel, player.playing.play_msgid, player.playing.end_msg).catch(e => console.log(e))
                        player.playing.bad_loop == null ? player.playing.bad_loop = 1 : player.playing.bad_loop++
                    }
                    console.log("Exception event while playing...")
                })
                player.on("stuck", () => {
                    player.setPaused(1)
                    player.resume()
                })
                player.on("start", () => {})
                player.on("end", async () => {
                    player.track = null;
                    if (player.loop_mode != "none") {
                        if (player.playing.bad_loop == undefined || player.playing.bad_loop < 4) {
                            if (player.loop_mode == "queue") {
                                //player.playing.play_msgid = null
                                //player.playing.end_msg = null
                                player.queue.push(player.playing)
                            }
                        }
                    }
                    if (player.loop_mode != "current track" || player.playing.end_msg.embed.title == "Skipped...") {
                        await bot.editMessage(player.playing.channel, player.playing.play_msgid, JSON.parse(JSON.stringify(player.playing.end_msg))).catch(e => {/*console.log(e)*/})
                        if (player.loop_mode == "queue") delete player.playing.play_msgid
                        delete player.playing;
                    }
                    if (shoukaku.connections.has(i.guildID)) await this.play(bot, i, shoukaku, player, inner)
                })
                player.on("error", async (err) => console.log(err))
                player.queue = []
                if (fs.existsSync(`./data/guild/Guild_${i.guildID}.json`)) {
                    console.log("abc")
                    player.loop_mode = JSON.parse(fs.readFileSync(`./data/guild/Guild_${i.guildID}.json`)).loop_mode || "none"
                } else player.loop_mode = "none"
                return player
            }
        } catch (error) {
            console.log(error)
            await shoukaku.leaveVoiceChannel(i.guildID)
        }
    },
    innerenqueue: async function (inner, i, player, bot) {
        try {
            let innerqueue = inner.get("innerqueue").get(i.guildID);
            if (innerqueue.length == 0) return inner.get("innerqueue").delete(i.guildID);
            let tobequeued = innerqueue.shift()
            let msgobj = g.msgobj(inner, 0)
            let queued = await this.enqueue(tobequeued, player)
            if (tobequeued?.loadType == "playlist") {
                msgobj.embed.description = `${queued} ${(queued==1? "track is": "tracks are")} placed in queue.`
            } else {
                msgobj.embed.description = `[${tobequeued.info.title}](${tobequeued.info.uri}) is placed in queue at position ${player.queue.length}.
                    Duration: ${tobequeued.info.length_r}`
            }
            if (tobequeued.original != undefined) {
                await bot.editMessage(tobequeued.channel, tobequeued.original, msgobj).catch(e => {console.log(e)})
                tobequeued.original = null
            } else if (tobequeued.iAID != undefined) {
                await bot.executeWebhook(tobequeued.iAID, tobequeued.iToken, msgobj).catch(e => {console.log(e)})
                tobequeued.iAID = null
                tobequeued.iToken = null
            }
            await this.innerenqueue(inner, i, player, bot)
        } catch (error) {
            console.log(error)
        }
    },
    leave: async (shoukaku, i) => {
        try {
            if (shoukaku.connections.has(i.guildID)) {
                await shoukaku.leaveVoiceChannel(i.guildID)
                i.channel.createMessage("Leave upon request")
            }
        } catch (error) {
            console.log(error)
        }
    },
    play: async (bot, interaction, shoukaku, player, inner) => {
        if (player.queue.length < 1 && (player.loop_mode != "current track" && !player.playing)) {
            shoukaku.frozen_players.set(interaction.guildID, shoukaku.players.get(interaction.guildID))
            shoukaku.players.delete(interaction.guildID)
            player.emptied_queue_timeout = setTimeout(() => {
                if (shoukaku.connections.has(interaction.guildID)) {
                    shoukaku.leaveVoiceChannel(interaction.guildID)
                }
            }, inner.get("configurations")["idle_timeout_millisec"]);
            switch (shoukaku.players.size) {
                case 1:
                    bot.editStatus("online", [{
                        name: `${shoukaku.players.values().next().value.playing.info.title}`, type: 2
                    }])
                    break;            
                case 0:
                    let configurations = inner.get("configurations")
                    bot.editStatus("online", [configurations.status[Math.floor(Math.random()*(configurations.status.length))]])
                    break;
            }
            return;
        }
        try {
            player.emptied_queue_timeout = clearTimeout(player.emptied_queue_timeout)
            if (!player.loop_mode == "current track" || !player.playing) {
                player.playing = player.queue.shift();
                player.musika_lastchannel = player.playing.channel
            }
            let msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = `[${player.playing.info.title}](${player.playing.info.uri})\nDuration: ${player.playing.info.length_r}`
            player.playing.end_msg = JSON.parse(JSON.stringify(msgobj))
            player.playing.end_msg.embed.title = "Finished playing"
            if (player.loop_mode == "current track") msgobj.embed.title = "Looping"
            else msgobj.embed.title = "Playing"
            msgobj.embed.description = msgobj.embed.description+`\nRequestor: <@${player.playing.requestor}>`
            if (!player.playing.play_msgid) {
                await bot.createMessage(player.playing.channel, msgobj).then(async newtrackmsg => {
                    player.playing.play_msgid = newtrackmsg.id
                }, (e) => {
                    console.log(e)            
                })
            }
            await player.playTrack({track: player.playing.encoded}).then(async ()=> {
                if (shoukaku.players.size == 1) {
                    bot.editStatus("online", [{
                        name: `${player.playing.info.title}`, type: 2
                    }])
                } else {
                    bot.editStatus("online", [{
                        name: "Musika", type: 4,
                        emoji: {name: ":notes:"},
                        state: "🎼 Music parties!"
                    }])
                }
            }).catch(e => {/*console.log(e)*/})
        } catch (e) {
            console.log(e)
        }
    },
    queue: async function(n, player, msgobj) {
        let first = 5*n-7 < 0? 0 : 5*n-6
        let last = player.queue.length-1 < 5*n-2? player.queue.length-1:5*n-2
        let buttons =[]
        msgobj.embed.description = ""
        if (first != 0) {
            buttons.push({"type": 2, "style": 2, "label": "◀ Previous page", "custom_id": `queue show ${n-1}`})
        } else {
            let symbol = typeof String
            if (player.paused) symbol = "⏸ "
            else symbol = "⏵ "
            let p = player.playing.info
            msgobj.embed.description = `${symbol}[${p.title}](${p.uri})\n${p.isStream?"":"Duration: "}${p.length_r}\nRequestor: <@${player.playing.requestor}>\n`
        }
        if (last != player.queue.length-1) buttons.push({"type": 2, "style": 2, "label": "▶ Next page", "custom_id": `queue show ${n+1}`})
        for (p = first; p<= last; p++) {
            let q = player.queue[p]
            msgobj.embed.description += `${p+1}. [${q.info.title}](${q.info.uri})\n${q.info.isStream?"":"Duration: "}${q.info.length_r}\nRequestor: <@${q.requestor}>\n`
        }
        msgobj.embed.description.trimEnd()
        if (first <= last) {
            msgobj.embed.footer.text = `Page ${Math.ceil((last+2)/5)} of ${Math.ceil((player.queue.length+2)/5)} · ${player.queue.length} ${(player.queue.length==1? "track is": "tracks are")} in queue\n${msgobj.embed.footer.text}`
        } else msgobj.embed.footer.text = `There is a track ${player.paused? "paused":"playing"} but nothing is in queue.\n${msgobj.embed.footer.text}`
        if (buttons.length > 0) msgobj.components.unshift({"type": 1, "components": buttons})
    },
    result_msg: async (bot, i, msgobj, results, inner) => {
        let r = 0
        if (results.data.length - 5 > 0) {
            r = 5
        } else r = results.data.length
        if (r == 0) {
            msgobj.embed.description = "No results."
            return i.createFollowup(msgobj)
        }
        msgobj.embed.title = "Search results - Please select one"
        msgobj.embed.description = ""
        let selections_components = []
        for (let k = 0; k < r; k++) {
            let m = results.data[k].info
            m.length_r = m.isStream? "Unpredictable duration as it is a live":g.readable_duration(m.length)
            msgobj.embed.description = `${msgobj.embed.description}${k+1}. [${m.title}](${m.uri}) - by ${m.author} (${m.length_r})\n`
            selections_components.push({"type": 2, "style": 1, "label": k+1, "custom_id": `queue add selection ${k+1}`})
        }
        inner.get("searchresults").set(i.id, results.data.slice(0, r))
        msgobj.components.unshift({"type": 1, 
            "components": selections_components
        })
        i.createFollowup(msgobj).then(async resultsmsg => {
            setTimeout(async () => {
                await bot.getMessage(resultsmsg.channel.id, resultsmsg.id).then(async (nrmsg) => {
                    if (!nrmsg.editedTimestamp) await bot.deleteMessage(resultsmsg.channel.id, resultsmsg.id)
                }).catch(async e => {
                    /*console.log(e)*/
                    await bot.deleteMessage(resultsmsg.channel.id, resultsmsg.id).catch(e => {/*console.log(e)*/})
                })
                inner.get("searchresults").delete(i.id)
            }, 180000);
        }).catch(e => {/*console.log(e)*/})
    },
    search: async (node, platform, query) => {
        return await node.rest.resolve(`ytsearch:${query}`).catch(e => {console.log(e)});
    },
    voiceChannelCheck: async (i, msgobj) => {
        if (!i.member.voiceState.channelID) {
            msgobj.embed.description = "Please join in a voice channel first."
            await i.createFollowup(msgobj).catch(e => {/*console.log(e)*/})
            return false;
        }
        return true;
    }
}