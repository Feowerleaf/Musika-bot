const fs = require("fs")
const g = require("../functions/reuse")

exports.characteristics = {
    category: "utilities",
    type: 1
}

exports.create = {
    "name": "configure",
    "name_localizations": {"zh-TW": "設置", "zh-CN": "設置"},
    "description": "Configure bot settings per guild(server).",
    "description_localizations": {"zh-TW": "調bot在服務器的設置", "zh-CN": "調bot在服務器的設置"}
}

exports.button = async (bot, interaction, inner, shoukaku) => {
    try {
        if (!interaction.member.permissions.has("manageGuild") || interaction.message.interaction.user.id != interaction.member.id) {
            let msgobj = g.msgobj(inner, 64)
            msgobj.embed.description = "This interaction is not available for you."
            interaction.createMessage(msgobj)
            return
        }
        await interaction.acknowledge()
        let msgobj = g.msgobj(inner, 0)
        if (interaction.data.custom_id.startsWith("configure guild")) {
            let sub = interaction.data.custom_id.slice(16).trimEnd()
            let guildJSON = {}
            if (fs.existsSync(`./data/guild/Guild_${interaction.guildID}.json`)) {
                guildJSON = JSON.parse(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`))
            } else {
                guildJSON.id = interaction.guildID
            }
            switch (sub) {
                case "dj":
                    guildJSON.DJ = interaction.data.values
                    fs.writeFileSync(`./data/guild/Guild_${interaction.guildID}.json`, JSON.stringify(guildJSON, null, 2), err => {
                        if (err) {
                            console.log(err);
                        }
                    })
                    msgobj.embed.title = "Successfully updated the list of DJ roles in this server."
                    msgobj.embed.description = "The roles are as shown below."
                    msgobj.embed.fields = []; msgobj.embed.fields[0] = {"name": "Role recognized as DJ", "value": ""}
                    for (n = 0; n < interaction.data.values.length; n++) {
                        msgobj.embed.fields[0].value += `<@&${interaction.data.values[n]}> `
                    }
                    if (msgobj.embed.fields[0].values == "") msgobj.embed.fields[0].values = "No roles selected"
                    await interaction.editMessage("@original", msgobj)
                    break;
            
                default:
                    break;
            }
            return;
        }
    } catch (error) {
        console.log(error)
    }
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode) => {
    if (!interaction.guildID) return;
    if (!interaction.member.permissions.has("manageGuild")) {
        let msgobj = g.msgobj(inner, 64)
        msgobj.embed.description = "This account is lack of the permission 'manageGuild'."
        await interaction.createMessage(msgobj).catch(err => console.log(err))
    } else {
        let msgobj = g.msgobj(inner, 0)
        let guildJSON = {}
        if (fs.existsSync(`./data/guild/Guild_${interaction.guildID}.json`)) {
            guildJSON = JSON.parse(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`))
            guildJSON.DJ = interaction.data.values
        } else {
            guildJSON.id = interaction.guildID
        }
        fs.writeFileSync(`./data/guild/Guild_${interaction.guildID}.json`, JSON.stringify(guildJSON, null, 2), err => {
            if (err) {
                console.log(err);
            }
        })
        msgobj.embed.description = "Select roles to be recognized by the bot as DJ"
        msgobj.components.unshift({"type": 1, "components": [{"type": 6, "custom_id": "configure guild dj", "max_values": 11}]})
        await interaction.createMessage(msgobj).catch(err => console.log(err))
    }
}