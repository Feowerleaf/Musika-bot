const fs = require('fs');
const g = require("../functions/reuse")

exports.characteristics = {
    category: "informative",
    type: 1
}

exports.create = {
    "name": "commands",
    "name_localizations": {"zh-TW": "列出指令", "zh-CN": "列出指令"},
    "description": "List commands.",
    "description_localizations": {"zh-TW": "列出指令", "zh-CN": "列出指令"}
}

exports.run = async (bot, interaction, inner) => {
    let msgobj = g.msgobj(inner, 0)
    fs.readdir('./src/cmd', (e, File) => {
        if (e) console.log(e);
        let commandobj = {};
        let commandjs = File.filter( f => f.split('.').pop() === 'js');
        commandjs.forEach(f => {
            let cmdFile = require(`./${f}`)
            function categorise() {
                let cmdcategory = cmdFile.characteristics.category
                if (commandobj[cmdcategory]) {
                    commandobj[cmdcategory].push("/" + (f.split('.').slice(0, 1)[0]))
                } else {
                    commandobj[cmdcategory] = []
                    commandobj[cmdcategory].push("/" + (f.split('.').slice(0, 1)[0]))
                }
            }
            if (cmdFile.create.guild_id) {
                if (cmdFile.create.guild_id.includes(interaction.guildID)) {
                    categorise()
                }
            } else {
                categorise()
            }
        });

        let field = []
        Object.keys(commandobj).forEach((keys, index) => {
            let newkey = keys.charAt(0).toUpperCase()+keys.slice(1)
            field.push({name: newkey, value: commandobj[keys].join('\n')})
        })
        msgobj.embed.title = "Command list"
        msgobj.embed.description = "Available commands grouped in category."
        msgobj.embed.fields = field;
        msgobj.embed.color = Math.floor(Math.random()*16777216);
        interaction.createMessage(msgobj)
    })
}