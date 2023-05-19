const { isCommand, convertAudioFile, getCi } = require("./utils");
const fs = require("fs");
const {MessageMedia} = require("whatsapp-web.js");
const { completion, transcribe } = require("./gpt");


async function sendMessage(message, text) {
    message.reply(await completion(text));
}

async function sendTranscription(message) {
    message.reply(await transcribe())
}
const handleMessage = async (message, chat, author) => {
    if (isCommand(message.body)) {
        const response = await executeCommand(message);
        if (response?.sticker) {
            const chat = await message.getChat();
            if (response.mens.toLowerCase() === "private".toLowerCase()) {
                await message.reply("No se puede crear sticker de una imagen privada.");
            } else {
                await chat.sendMessage(response.sticker, { sendMediaAsSticker: true });
            }
        }
        else if (response.audioFile) {
            sendTranscription(message);
        }
        else if (response.gptMessage) {
            sendMessage(message, response.gptMessage)
        }
        else{
            await message.reply(response);
        }
    }
}

const executeCommand = async (msg) => {
    const command =  msg.body.split(' ')[0].replace('>>', '');
    switch(command) {
        case 'sticker': {
            const quoted = await msg.getQuotedMessage();
            if (quoted && quoted.hasMedia) {
                try {
                    const media = await quoted.downloadMedia();
                    if (media.mimetype === 'image/jpeg') {
                        await fs.promises.writeFile(`temp/sticker.jpg`, media.data, 'base64');
                        const sticker = MessageMedia.fromFilePath(`temp/sticker.jpg`);
                        return {sticker, mens: quoted.body};
                    } else {
                        return "El comando debe ejecutarse respondiendo a una imagen.";
                    }
                } catch (err) {
                    console.log(err);
                    return "Los datos del mensaje no se encuentran en el caché del bot. Intenta reenviar la imagen.";
                }

            } else {
                return "El comando debe ejecutarse respondiendo a una imagen.";
            }
            break;
        }
        case 'dado':
            const randomNum = Math.floor(Math.random() * 6) + 1;
            return `Dado: ${randomNum}`;
        case 'ask':
            const text = msg.body.split(' ');
            text.shift();
            const result = text.join(" ");
            if (result.length > 250) {
                return "El mensaje es demasiado largo."
            }
            return {gptMessage: result};
        case 'searchCi':
            const commandText = msg.body.split(' ');
            commandText.shift();
            const nameString = commandText.join(" ");
            if (nameString.length > 100) {
                return "El mensaje es demasiado largo."
            }
            return await getCi(nameString, false);
        case 'transcribe':
            const quoted = await msg.getQuotedMessage();
            if (quoted && quoted.hasMedia) {
                try {
                    const media = await quoted.downloadMedia();
                    if (media.mimetype.includes('audio/ogg')) {
                        await fs.promises.writeFile("temp/audio.ogg", media.data, 'base64');
                        await convertAudioFile();
                        return { audioFile: true };
                    } else {
                        return "El comando debe ejecutarse respondiendo a un audio.";
                    }
                } catch (err) {
                    console.log(err);
                    return "Los datos del mensaje no se encuentran en el caché del bot. Intenta reenviar el audio.";
                }
            }
    }
}

module.exports = { handleMessage }
