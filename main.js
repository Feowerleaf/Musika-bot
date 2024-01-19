//Libraries
const eris = require('eris');
const fs = require('fs');
const { Shoukaku, Connectors, Player, Node } = require('shoukaku');
const yaml = require('yaml')
let g = require('./src/functions/reuse')

//Parameter
let configurations = yaml.parse(fs.readFileSync("./config.yml", "utf-8"));
const TOKEN = configurations.token;
const rmco = configurations.register_musika_commands_only
const version = "Musika 𐤀 Build 10 - ջ Version under testing"
let the_bot_itself = {}

//Data
const inner = new Map()
inner.set("innerqueue", new Map())
inner.set("searchresults", new Map())
inner.set("footer", version)
inner.set("configurations", configurations)
if(!fs.existsSync("./data")) fs.mkdirSync("./data")
if(!fs.existsSync("./data/guild")) fs.mkdirSync("./data/guild")

// Create a Client instance with our bot token.
const bot = new eris.Client(TOKEN)

// Create a Shoukaku instance that connects to Lavalink server
const Nodes = configurations.nodes
const shoukaku = new Shoukaku(new Connectors.Eris(bot), Nodes, {resumeByLibrary: true});
if (configurations?.shoukaku_debug == true) shoukaku.on("debug", async (res, info) => {
    let time = new Date();console.log(time[Symbol.toPrimitive]('string')+res); console.log(info)
})
// ALWAYS handle error, logging it will do
shoukaku.on('error', (_, error) => console.error(error));
// This helps to search
let searchNode = new Node(shoukaku, Nodes[0])
shoukaku.frozen_players = new Map()

//Import commands
async function loadcmds(interaction) {
    async function proceed() {
        fs.readdir('./src/cmd', async (err, File) => {
            if (err) console.log(err);
            let sjsfiles = File.filter( f => f.split('.').pop() === 'js');
            if (sjsfiles.length <= 0) {
                console.log('No command js file is found!!!');
            } else {
                console.log('Found '+sjsfiles.length+' commands!');
                let commandIDobj = {}; commandIDobj.global = {}; commandIDobj.guild = {};
                async function nonbulk() {
                    if (sjsfiles.length < 1) return;
                    let f = sjsfiles.shift();
                    delete require.cache[require.resolve(`./src/cmd/${f}`)];
                    let cmds = require(`./src/cmd/${f}`);
                    console.log(`Loading ${f}...`);
                    if ("guild_id" in cmds.create) {
                        let guildarr = [].concat(cmds.create.guild_id);
                        if (guildarr.length < 1 ) return;
                        commandIDobj.guild[f.split('.').shift()] = {}
                        let cguildarr = [].concat(guildarr)
                        async function guildnonbulk() {
                            if (cguildarr.length < 1) return;
                            let guild = cguildarr.shift()
                            let commandID = await bot.createGuildCommand(guild, cmds.create);
                            commandIDobj.guild[f.split('.').shift()][commandID.guild_id] = commandID.id;
                            console.log("Registered command '" + f.split('.').shift() + "' at guild with ID " + guild);
                            await guildnonbulk()
                        }
                        await guildnonbulk()
                        console.log("Registered " + f.split('.').shift());
                    } else {
                        let commandID = await bot.createCommand(cmds.create);
                        commandIDobj.global[commandID.name] = commandID.id;
                        console.log("Registered global command: " + f.split('.').shift());
                    }
                    await nonbulk()
                }

                async function bulk() {
                    let global = []
                    let guilds = new Map()
                    sjsfiles.forEach(async f => {
                        delete require.cache[require.resolve(`./src/cmd/${f}`)];
                        let cmds = require(`./src/cmd/${f}`);
                        console.log(`Loading ${f}...`);
                        if ("guild_id" in cmds.create) {
                            let guildarr = [].concat(cmds.create.guild_id);
                            guildarr.forEach(async gID => {
                                if (!guilds.has(gID)) guilds.set(gID,[])
                                guilds.get(gID).push(cmds.create)
                            })
                        } else {
                            global.push(cmds.create)
                        }
                    });
                    commandIDobj.global_bulk = await bot.bulkEditCommands(global).catch(e => console.log(e))
                    commandIDobj.guild_bulk = []
                    let guilds_entries = guilds.entries()
                    for (i = 0; i < guilds.size; i++) {
                        let c_arr = guilds_entries.next().value
                        delete c_arr[1].guild_id
                        await commandIDobj.guild_bulk.push(await bot.bulkEditGuildCommands(c_arr[0], c_arr[1]).catch(e => console.log(e)))
                    }
                    commandIDobj.global_bulk.forEach(command_obj => {
                        commandIDobj.global[command_obj.name] = command_obj.id;
                    });
                    delete commandIDobj["global_bulk"]
                    commandIDobj.guild_bulk.forEach(guild_commands => {
                        guild_commands.forEach(command_obj => {
                            if (!commandIDobj.guild[command_obj.name]) commandIDobj.guild[command_obj.name] = {}
                            commandIDobj.guild[command_obj.name][command_obj.guild_id] = command_obj["id"]
                        });
                    });
                    delete commandIDobj["guild_bulk"]
                }
                if (rmco) {
                    await bulk();
                    console.log("\nBulk edit of commands has done.\nThis method removes commands other than Musika's.")
                    console.log("If you wish to change this behaviour, please change it in 'config.json' file.")
                }
                else {await nonbulk(); console.log("\nAll commands have been registered.")}
                console.log(commandIDobj);
            }
        })

        fs.readdir('./src/functions', async (err, File) => {
            let sjsfiles = File.filter( f => f.split('.').pop() === 'js');
            if (sjsfiles.length > 0) {
                sjsfiles.forEach(async f => {
                    delete require.cache[require.resolve(`./src/functions/${f}`)];
                });
            }
        })
    }
    if (!interaction.id) proceed()
    else {
        let permitted = configurations.permitted_personnel
        if (permitted.includes(interaction.member.id)) {
            await interaction.acknowledge()
            await proceed()
            return true;
        } else{
            return false;
        }
    }
}
console.log("\nThanks for using\nThis version is " + version)

//Event area

bot.once("ready", async () => {
    let interaction = {}
    await loadcmds(interaction);
    console.log("Connected and ready.")
    the_bot_itself = await bot.getSelf()
    setInterval((function status () {
        switch (shoukaku.players.size) {
            case 1:
                bot.editStatus("online", [{
                    name: `${shoukaku.players.values().next().value.playing.info.title}`, type: 2
                }])
                break;
        
            case 0:
                bot.editStatus("online", [configurations.status[Math.floor(Math.random()*(configurations.status.length))]])
                break;
        }
        return status
    })(), 600000);
})

bot.on("ready", async () => console.log("Connected and ready."))

bot.on("interactionCreate", async (interaction) => {
    //console.log(interaction)
    if(interaction instanceof eris.CommandInteraction) {
        let cmd = interaction.data.name;
        try {
            if (cmd == "reload") {let permission = await loadcmds(interaction); let cmdFile = require("./src/cmd/reload.js");cmdFile.run(interaction, permission, inner); return;}
            if (fs.existsSync(`./src/cmd/${cmd}.js`)) {
                let cmdFile = require(`./src/cmd/${cmd}.js`)
                cmdFile.run(bot, interaction, inner, shoukaku, searchNode)
            } else {
                if (rmco == false) return;
                interaction.createMessage("Internal Error...")
            }
        } catch (err) {
            console.log(err);
        }
    } else if (interaction instanceof eris.ComponentInteraction) {
        try {
            if (interaction.data.custom_id == "Delete message") {
                let msgobj = g.msgobj(inner, 64)
                if (interaction.message.interaction?.user.id == interaction.member.id) {
                    msgobj.embed.description = "Message deleted."
                    await bot.deleteMessage(interaction.message.channel.id, interaction.message.id).catch(e => {/*console.log(e)*/})
                    interaction.createMessage(msgobj);
                } else {
                    msgobj.embed.description = "This interaction is not for you."
                    interaction.createMessage(msgobj)
                }
            } else{
                if (fs.existsSync(`./src/cmd/${interaction.data.custom_id.split(' ')[0]}.js`)) {
                    let cpn = require(`./src/cmd/${interaction.data.custom_id.split(' ')[0]}.js`)
                    cpn.button(bot, interaction, inner, shoukaku)
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
});

bot.on("guildCreate", async (guild) => {
    let time = new Date()
    console.log("Joined " + guild.name + " " + guild.id + " at "+ time[Symbol.toPrimitive]('string'))
})

bot.on("voiceChannelJoin", async (member, channel) => {
    let msgobj = {embed:{footer: {text: version}, color: Math.floor(Math.random()*16777216)}}
    if (shoukaku.players.has(channel.guild.id) && channel.voiceMembers.size > 2) {
        let player = shoukaku.players.get(channel.guild.id)
        if (player.paused == 1 && player.alonePause == true) {
            player.setPaused(false)
            msgobj.embed.description = "Player has resumed as someone joined."
            await bot.createMessage(p.musika_lastchannel, msgobj).catch(e => console.log(e))
        }
    } else if (shoukaku.players.has(channel.guild.id) && channel.voiceMembers.size == 2) {
        let player = shoukaku.players.get(channel.guild.id)
        if (player.no_listener_timeout) clearTimeout(player.no_listener_timeout)
    }
})

bot.on("voiceChannelLeave", async (member, oldChannel) => {
    let msgobj = {embed:{footer: {text: version}, color: Math.floor(Math.random()*16777216)}}
    if (oldChannel.voiceMembers.has(the_bot_itself.id) && oldChannel.voiceMembers.size == 1 ) {
        try {
            let p = shoukaku.players.get(oldChannel.guild.id)
            p.no_listener_timeout = setTimeout(async () => {
                await shoukaku.leaveVoiceChannel(oldChannel.guild.id).then(async (p) => {
                    if (p?.musika_lastchannel && p?.playing) {
                        msgobj.embed.description = "Last person has left. Player in this server has been reset."
                        await bot.createMessage(p.musika_lastchannel, msgobj)
                        await bot.editMessage(p.playing.channel, p.playing.play_msgid, JSON.parse(JSON.stringify(p.playing.end_msg))).catch(e => {/*console.log(e)*/})
                    }
                })
                switch (shoukaku.players.size) {
                    case 1:
                        bot.editStatus("online", [{
                            name: `${shoukaku.players.values().next().value.playing.info.title}`, type: 2
                        }])
                        break;
                
                    case 0:
                        bot.editStatus("online", [configurations.status[Math.floor(Math.random()*(configurations.status.length))]])
                        break;
                }
            }, configurations.no_listener_millisec);
        } catch (error) {
            console.log(error)
        }
    } else if (member.id == the_bot_itself.id) {
        try {
            let p = await shoukaku.leaveVoiceChannel(oldChannel.guild.id)
            if (p?.musika_lastchannel && p?.playing) {
                msgobj.embed.description = "Bot was disconnected. Player in this server has been reset."
                await bot.createMessage(p.musika_lastchannel, msgobj)
                await bot.editMessage(p.playing.channel, p.playing.play_msgid, JSON.parse(JSON.stringify(p.playing.end_msg))).catch(e => {/*console.log(e)*/})
            }
        } catch (error) {
            console.log(error)
        }
    }
})

bot.on("voiceChannelSwitch", async (member, newChannel, oldChannel) => {
    let msgobj = {embed:{footer: {text: version}, color: Math.floor(Math.random()*16777216)}}
    if (oldChannel.voiceMembers.has(the_bot_itself.id) && oldChannel.voiceMembers.size == 1 ) {
        try {
            let p = await shoukaku.leaveVoiceChannel(oldChannel.guild.id)
            msgobj.embed.description = "Last person has left. Player in this server has been reset."
            await bot.createMessage(p.musika_lastchannel, msgobj)
        } catch (error) {
            console.log(error)
        }
    }
    switch (shoukaku.players.size) {
        case 1:
            bot.editStatus("online", [{
                name: `${shoukaku.players.values().next().value.playing.info.title}`, type: 2
            }])
            break;
    
        case 0:
            bot.editStatus("online", [configurations.status[Math.floor(Math.random()*(configurations.status.length))]])
            break;
    }
})

bot.on('error', err => {
    console.warn(err);
 });

bot.connect();