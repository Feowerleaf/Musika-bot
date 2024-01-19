const fs = require("node:fs")
const g = require("../functions/reuse")
const yaml = require('yaml')
let configuration = yaml.parse(fs.readFileSync("./config.yml", "utf-8"));

exports.characteristics = {
    category: "utilities",
    type: 1
}

exports.create = {
    "name": "reload",
    "name_localizations": {"zh-TW": "重新load過", "zh-CN": "重新load過"},
    "description": "Reload commands.",
    "description_localizations": {"zh-TW": "重新load過command", "zh-CN": "重新load過command"},
    "guild_id": configuration["reload_in_guild"]
}

exports.run = async (interaction, permission, inner) => {
    let msgobj = g.msgobj(inner, 0)
    msgobj.embed.color = Math.floor(Math.random()*16777216);
    if (permission) msgobj.embed.description = "Done reloading."
    else msgobj.embed.description = "You do not have the permission to do so."
    interaction.createMessage(msgobj)
}