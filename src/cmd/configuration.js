const fs = require("fs")
const g = require("../functions/reuse")

exports.characteristics = {
    category: "utilities",
    type: 1
}

exports.create = {
    "name": "configuration",
    "description": "Configuration of the bot settings per guild(server)."
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    try {
        if (!interaction.guildID) return;
        if (!interaction.member.permissions.has("manageGuild")) {
            let msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = "This account is lack of the permission 'manageGuild'."
            await interaction.createMessage(msgobj)
        } else {
            await interaction.acknowledge()
            let msgobj = g.msgobj(inner, 0)
            let guildJSON = {},  DJ = false
            if (fs.existsSync(`./data/guild/Guild_${interaction.guildID}.json`)) {
                guildJSON = JSON.parse(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`))
                if (guildJSON.DJ && guildJSON.DJ.length > 0) {
                    DJ = true
                }
            }
            if (DJ) {
                msgobj.embed.title = "Configuration value of the bot in this guild"
                msgobj.embed.description = "To limit certain roles from using some commands, or only allow command usage in certain channels, please set it in guild settings."
                msgobj.embed.description += "\n\nDJ roles will grant people without manage server permission to override the other while playing music."
                msgobj.embed.fields = []; msgobj.embed.fields[0] = {"name": "Role recognized as DJ", "value": ""}
                for (n = 0; n < guildJSON.DJ.length; n++) {
                    msgobj.embed.fields[0].value += `<@&${guildJSON.DJ[n]}> `
                }
                await interaction.createFollowup(msgobj)
            } else {
                msgobj.embed.description = "No roles are recognized as DJ."
                await interaction.createFollowup(msgobj)
            }
        }
    } catch (error) {
        
    }
}