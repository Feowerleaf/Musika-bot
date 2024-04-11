const fs = require("fs")
module.exports = {
    duration: (hour, min, sec) => {
        return hour*60*60*1000+min*60*1000+sec*1000
    },
    is_DJ: async (interaction) => {
        if (!fs.existsSync(`./data/guild/Guild_${interaction.guildID}.json`) || !(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`)).DJ) return false
        let guildJSON = JSON.parse(fs.readFileSync(`./data/guild/Guild_${interaction.guildID}.json`))
        if (guildJSON.DJ.length < 1 ) return false
        for (n = 0; n < guildJSON.DJ.length; n++) {
            if (interaction.member.roles.includes(guildJSON.DJ[n])) return true;
        };
        return false;
    },
    msgobj: (inner, f) => {
        if (f == 0) {
            return {embed:{footer: {text: inner.get("footer")}, color: Math.floor(Math.random()*16777216)}, 
                components: [{"type": 1, "components": [{"type": 2, "style": 4, "label": "Delete this message", "custom_id": "Delete message" }]}]}
        } else return {embed:{footer: {text: inner.get("footer")}, color: Math.floor(Math.random()*16777216)}, flags:64}
    },
    readable_duration: (ms) => {
        let remainder = typeof Number
        let days = Math.floor(ms/86400000).toString()
        remainder = Math.floor(ms%86400000)
        let hours = (Math.floor(remainder/3600000) < 10)? "0"+(Math.floor(remainder/3600000).toString()):Math.floor(remainder/3600000).toString()
        remainder = remainder%3600000
        let minutes = (Math.floor(remainder/60000) < 10)? "0"+(Math.floor(remainder/60000).toString()):Math.floor(remainder/60000).toString()
        remainder = remainder%60000
        let seconds = (Math.round(remainder/1000) < 10)? "0"+(Math.round(remainder/1000).toString()):Math.round(remainder/1000).toString()
        if (days == "0") {
            if(hours == "00") {
                if(minutes == "00") return `0:${seconds}`; else return `${minutes}:${seconds}`
            } else return `${hours}:${minutes}:${seconds}`
        } else return `${days}:${hours}:${minutes}:${seconds}`
    },
    add_http: (str) => {
        let cut_str = str.split("://")
        if (cut_str.length > 2) return "";
        if (cut_str[cut_str.length-1].includes(" ") || !cut_str[cut_str.length-1].includes(".")) return "";
        if (cut_str.length == 2) {
            if (cut_str[0] == "http" || cut_str[0] == "https") return str
            else return "";
        }
        return (`http://${str}`)
    }
}