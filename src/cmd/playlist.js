const crypto = require("node:crypto")
const g = require("../functions/reuse")

/*async function checkANDreturnID(checkingarray, desiredname, udb, pdb) {
    if (checkingarray.length < 1) return "";
    let plID = checkingarray.shift()
    let retrievedname = await pdb.get(`${plID}.title`)
    if (retrievedname == desiredname) {return plID;}
    return await checkANDreturnID(checkingarray, desiredname, udb, pdb)
}*/

/*async function checkANDreturnNAME(checkingarray, desiredID, udb, pdb) {
    if (checkingarray.length < 1) return "";
    if (checkingarray.includes(desiredID)) {
        return await pdb.get(`${desiredID}.title`)
    } else return "";
}*/

exports.create = {
    "name": "playlist",
    "name_localizations": {"zh-TW": "歌單"},
    "description": "Commands about playlist.",
    "description_localizations": {"zh-TW": "一切跟歌單有關的指令"},
    "options": [
        {
            "name": "create",
            "name_localizations": {"zh-TW": "新建"},
            "description": "Create a playlistfor saving songs",
            "description_localizations": {"zh-TW": "做一個新的歌單"},
            "type": 1,
            "options": [
                {
                    "name": "name_of_playlist",
                    "name_localizations": {"zh-TW": "歌單名", "zh-CN": "歌單名"},
                    "description": "Give your playlist a title.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "nickname",
                    "name_localizations": {"zh-TW": "假名", "zh-CN": "假名"},
                    "description": "Hide your name from the playlist.",
                    "type": 3,
                    "required": false
                },
                {
                    "name": "visibility",
                    "name_localizations": {},
                    "description": "Control who can see this playlist. Default is only you yourself.",
                    "type": 3,
                    "required": false,
                    "choices": [
                        {"name": "Everyone", "value": "everyone"},
                        {"name": "Private", "value": "private"}
                    ]
                }
            ]
        },
        {
            "name": "delete",
            "name_localizations": {"zh-TW": "刪除", "zh-CN": "刪除"},
            "description": "Delete the specified playlist.",
            "description_localizations": {"zh-TW": "刪除指定的歌單", "zh-CN": "刪除指定的歌單"},
            "type": 1,
            "options": [
                {
                    "name": "name_of_playlist",
                    "name_localizations": {"zh-TW": "歌單名", "zh-CN": "歌單名"},
                    "description": "Provide title of the playlist you want to delete.",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "edit",
            "name_localizations": {"zh-TW": "更動"},
            "description": "Edit the specified playlist.",
            "description_localizations": {"zh-TW": "更動歌單"},
            "type": 1,
            "options": [
                {
                    "name": "name_of_album",
                    "name_localizations": {"zh-TW": "歌單名"},
                    "description": "Provide title of the playlist you want to edit.",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "view",
            "name_localizations": {"zh-TW": "翻看"},
            "description": "View the specified playlist.",
            "description_localizations": {"zh-TW": "翻看歌單"},
            "type": 1,
            "options": [
                {
                    "name": "name_of_playlist",
                    "name_localizations": {"zh-TW": "歌單名"},
                    "description": "Provide title of the playlist you want to view",
                    "type": 3,
                    "required": true
                }
            ]
        }
    ]
}

exports.characteristics = {
    category: "musical",
    type: 1
}

exports.button = async (bot, interaction, inner, shoukaku, Musika) => {
    let msgobj = g.msgobj(inner, 0)
    if (interaction.data.custom_id.startsWith("playlist confirm deletion")) {
        let desiredname = interaction.data.custom_id.slice(26).trimEnd()
        Musika.collection("playlists").findOneAndDelete({"title": desiredname, "userID": interaction.member.user.id}).then(async (file) => {
            if (file.value == null) {
                msgobj.embed.title = "❌"
                msgobj.embed.description = "You do not have a playlist with the name you provided."
                msgobj.flags = 64; msgobj.components = []
                interaction.createMessage(msgobj)
            } else {
                msgobj.embed.description = `Successfully deleted playlist which title is **${desiredname}**`
                msgobj.flags = 64; msgobj.components = []
                interaction.createMessage(msgobj)
            }
        })
    } else {
        console.log(interaction.data.custom_id)
        console.log(await udb.has(interaction.member.user.id))
    }
}

exports.run = async (bot, interaction, inner, shoukaku, searchNode, Musika) => {
    if (!interaction.guildID) return;
    let msgobj = g.msgobj(inner, 0)
    let subcommand = interaction.data.options[0].name;
    let hash = crypto.createHash("sha256")
    if ( subcommand == "create") {
        let desiredname = "", nickname = "", visibility = "private"
        for (i=0; i<interaction.data.options[0].options.length; i++) {
            switch (interaction.data.options[0].options[i].name) {
                case "name_of_playlist":
                    desiredname = interaction.data.options[0].options[i].value
                    break;
                case "nickname":
                    nickname = interaction.data.options[0].options[i].value
                    break;
                case "visibility":
                    visibility = interaction.data.options[0].options[i].value
                    break;
                default:
                    break;
            }
        }
        await Musika.collection("playlists").findOne({"title": desiredname, "userID": interaction.member.user.id}).then(async (file)=> {
            if (file == null) {
                if (desiredname.length > 36) {
                    msgobj.embed.description = "Length of the title exceeds 36 characters."
                    if (visibility == "private") {msgobj.flags = 64; msgobj.components = []}
                    interaction.createMessage(msgobj)
                    return;
                }
                await Musika.collection("playlists").insertOne({"title": desiredname, "userID": interaction.member.user.id, "items": []})
                msgobj.embed.description = `Successfully created a playlist with the name ${desiredname}. You can start to add something in it now.`
                if (visibility == "private") {msgobj.flags = 64; msgobj.components = []}
                interaction.createMessage(msgobj)
            } else {
                msgobj.embed.title = "❌"
                msgobj.embed.description = `You have a playlist with the name ${desiredname}.\nPlease choose another name, or rename the another playlist first.`
                interaction.createMessage(msgobj)
            }
        })
    } else if (subcommand == "delete") {
        let desiredname = interaction.data.options[0].options[0].value
        Musika.collection("playlists").findOne({"title": desiredname, "userID": interaction.member.user.id}).then(async (file) => {
            if (file == null) {
                msgobj.embed.title = "❌"
                msgobj.embed.description = "You do not have a playlist with the name you provided."
                msgobj.flags = 64; msgobj.components = []
                interaction.createMessage(msgobj)
            } else {
                msgobj.embed.description = `Are you sure you want to delete the playlist **${desiredname}**?`
                msgobj.flags = 64
                msgobj.components = [{"type": 1, "components": [{"type": 2, "style": 4, "label": "Yes, delete the playlist.", "custom_id": `playlist confirm deletion ${desiredname}` }]}]
                interaction.createMessage(msgobj)
            }
        })
    }
}