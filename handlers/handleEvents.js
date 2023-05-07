const fs = require('fs');
const path = require('path');
const { Events } = require('../utility/validation/EventNames') 

module.exports = (client) => {
    client.handleEvents = async () => {
        const eventsFolders = fs.readdirSync(path.join(__dirname, '../events'))
        for (const eventsFolder of eventsFolders) {
            const eventsFiles = fs
            .readdirSync(path.join(__dirname, '../events', eventsFolder))
            .filter(file => file.endsWith('.js'));
            switch(eventsFolder) {
                case 'client':
                    for(const eventsFile of eventsFiles) {
                        const event = require(`../events/${eventsFolder}/${eventsFile}`)
                        if (!Events.some(evt => evt === event.name)) return console.log(`El evento ${event.name} no existe`)
                        if(event.once) client.once(event.name, (...args) => event.execute(...args, client))
                        else client.on(event.name, (...args) => event.execute(...args, client));
                    }
                break;
            }
        }
    }
}