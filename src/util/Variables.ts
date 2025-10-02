import { Message, ChatInputCommandInteraction, GuildMember, User, BaseInteraction } from 'discord.js';

export type VariableType = {
    name: string,
    value: string | null | undefined
}

const variables = (input: Message | ChatInputCommandInteraction | GuildMember | BaseInteraction) => {

    return {
        user: {
            title: 'Información del usuario/autor',
            vars: [
                {
                    "name": "{user}",
                    "value": input instanceof Message ? `<@${input.author.id}>` : `<@${input.user.id}>`,
                    description: "Menciona al usuario"
                },
                {
                    "name": "{user_tag}",
                    "value": input instanceof Message ? input.author.tag : input.user.tag,
                    description: "Muestra el nombre de usuario"
                },
                {
                    "name": "{user_name}",
                    "value": input instanceof Message ? input.author.username : input.user.username,
                    description: "Muestra el nombre de usuario"
                },
                {
                    "name": "{user_avatar}",
                    "value": input instanceof Message ? input.author?.avatarURL({ size: 1024 }) : input.user?.avatarURL({ size: 1024 }),
                    description: "Muestra el ávatar del usuario"
                },
                {
                    "name": "{user_discrim}",
                    "value": input instanceof Message ? input.author?.discriminator : input.user?.discriminator,
                    description: "Muestra el nombre del usuario"
                },
                {
                    "name": "{user_id}",
                    "value": input instanceof Message ? input.author?.id : input.user?.id || input.id,
                    description: "Muestra el id del usuario"
                },
                {
                    "name": "{user_nick}",
                    "value": input instanceof GuildMember ? input?.displayName : (input.member as GuildMember)?.displayName,
                    description: "Muestra el nick o apodo del usuario"
                },
                {
                    "name": "{user_joindate}",
                    "value": input instanceof GuildMember ? `${input?.joinedAt?.toLocaleDateString()}` : `${(input.member as GuildMember)?.joinedAt?.toLocaleDateString()}`,
                    description: "Muestra la fecha en la que el usuario se unió al servidor"
                },
                {
                    "name": "{user_createdate}",
                    "value": input instanceof Message ? `${input.author?.createdAt?.toLocaleDateString()}` : `${input.user?.createdAt?.toLocaleDateString()}`,
                    description: "Muestra la fecha en la que el usuario se unió a Discord"
                },
                {
                    "name": "{user_displaycolor}",
                    "value": input instanceof GuildMember ? input.displayHexColor : (input.member as GuildMember)?.displayHexColor,
                    description: "Muestra el color del usuario"
                },
                {
                    "name": "{user_boostsince}",
                    "value": input instanceof GuildMember ? input.premiumSince : (input.member as GuildMember)?.premiumSince || 'sin datos',
                    description: "Muestra la fecha en la que el usuario ha boosteado el servidor"
                }]
        },
        server: {
            title: 'Información del servidor',
            vars: [
                {
                    "name": "{server_name}",
                    "value": input.guild?.name
                },
                {
                    "name": "{server_id}",
                    "value": input.guild?.id
                },
                {
                    "name": "{server_membercount}",
                    "value": `${input.guild?.memberCount}` || '0'
                },
                {
                    "name": "{server_membercount_nobots}",
                    "value": `${input.guild?.members.cache.filter((member: { user: { bot: any; }; }) => !member.user.bot).size}` || '0'
                },
                {
                    "name": "{server_botcount}",
                    "value": `${input.guild?.members.cache.filter((member: { user: { bot: any; }; }) => member.user.bot).size}` || '0'
                },
                {
                    "name": "{server_icon}",
                    "value": input.guild?.iconURL({ size: 1024 })
                }
            ]
        },
        totalvars() {
            return (this.server.vars).concat(this.user.vars as any[])
        }
    }
}

var functions = [
    {
        name: '{requireuser:}',
        type: 'Permisos',
        restriction: { ar: true },
        description: 'Especifica los únicos usuarios que podrán ejecutar el autoresponder',
        uso: '\`{requireuser:@mención}\`'
    },
    {
        name: '{dm}',
        type: 'Tipos de respuesta',
        restriction: { ar: true },
        description: 'Envía el autoresponder al dm del autor',
        uso: '\`{dm}\`'
    },
    {
        name: '{sendto:}',
        type: 'Tipos de respuesta',
        restriction: { ar: true },
        description: 'Envía el autoresponder a un canal específico',
        uso: '\`{sendto:}\`'
    },
    {
        name: '{requirechannel:}',
        type: 'Tipos de respuesta',
        restriction: { ar: true },
        description: 'Especifica los únicos canales donde se ejecutará el autorresponder',
        uso: '\`{requirechannel:#channel}\`'
    },
    {
        name: '{denychannel:}',
        type: 'Tipos de respuesta',
        restriction: { ar: true },
        description: 'Especifica los canales donde **NO** se ejecutará el autorresponder',
        uso: '\`{denychannel:#channel}\`'
    },
    {
        name: '{requirerole:}',
        type: 'Permisos',
        restriction: { ar: true },
        description: 'Especifica los roles que deben tener los usuarios que ejecutarán el autorresponder',
        uso: '\`{requirerole:@role}\`'
    },
    {
        name: '{denyrole:}',
        type: 'Permisos',
        restriction: { ar: true },
        description: 'Especifica los roles que **NO** deben tener los usuarios que ejecutarán el autorresponder',
        uso: '\`{denyrole:#channel}\`'
    },
    {
        name: '{embed:}',
        type: 'Tipos de respuesta',
        restriction: { ar: true, welc: true, embed: true, bye: true },
        description: 'Envía el autoresponder en un embed',
        uso: '\`{embed}\` (color por defecto)\`{embed:#000000}\` (color personalizado en código hex)'
    },
    {
        name: '{react:}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Reacciona al mensaje del autor con un emoji específico',
        uso: '\`{react:<emoji>}\`',
        ejemplo: `\`{react:<:__:1095561613018419250>}\` \`{react:🤍}\``
    },
    {
        name: '{reactreply:}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Reacciona a la respuesta del bot con un emoji específico',
        uso: '\`{reactreply:<emoji>}\`',
        ejemplo: `\`{reactreply:<:__:1095561613018419250>}\` \`{reactreply:🤍}\``
    },
    {
        name: '{delete}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Elimina el mensaje enviado por el usuario',
        uso: '\`{delete}\`'
    },
    {
        name: '{deletereply:}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Elimina el mensaje enviado por el bot',
        uso: '\`{deletereply:<tiempo de eliminación en segundos>}\`',
        ejemplo: `\`{deletereply:2}\``
    },
    {
        name: '{addrole:}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Añade un rol al usuario',
        uso: '\`{addrole:<@rol>}\` \`{addrole:<@rol>|<@usuario/[$N]>}\`',
        ejemplo: `\`{addrole:@miembro}\` \`{addrole:@moderador|@alys}\` \`{addrole:@moderador|[$1]}\``
    },
    {
        name: '{removerole:}',
        type: 'Misceláneos',
        restriction: { ar: true },
        description: 'Remueve un rol del usuario',
        uso: '\`{removerole:<@rol>}\` \`{removerole:<@rol>|<@usuario/[$N]>}\`',
        ejemplo: `\`{removerole:@miembro}\` \`{removerole:@moderador|@alys}\` \`{removerole:@moderador|[$1]}\``
    }
]

const matches = {
    user_avatar: /(?<={user_avatar:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    requireuser: /(?<={requireuser:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    sendto: /(?<={sendto:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    requirechannel: /(?<={requirechannel:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    denychannel: /(?<={denychannel:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    requirerole: /(?<={requirerole:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    denyrole: /(?<={denyrole:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    embed: /(?<={embed:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    addrole: /(?<={addrole:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    removerole: /(?<={removerole:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    font: /(?<={font:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/i,
    react: /(?<={react:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    reactreply: /(?<={reactreply:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    deletereply: /(?<={deletereply:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    requireperm: /(?<={requireperm:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    range: /(?<={range)(\d*?:.+?(?:(?<=\{)\w*(?=\}).+?)*(?=}))/gi,
    choose: /(?<={choose)(\d*?:.+?(?:(?<=\{)\w*(?=\}).+?)*(?=}))/gi,
    setnick: /(?<={setnick:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/i,
    requirearg: /(?<={requirearg:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    choosevalues: /(?<={choosevalues)(\d*?:.+?(?:(?<=\{)\w*(?=\}).+?)*(?=}))/gi,
    waitresponse: /(?<={waitresponse:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/i,
    button: /(?<={button:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/gi,
    cooldown: /(?<={cooldown:).+?(?:(?<=\{)\w*(?=\}).+?)*(?=})/i,
    modifybal: /(?<={modifybal:)(.+?(?:(?<=\{)\w*(?=\}).+?)*(?=}))/gi
}

function getVars(text: string, startTag: string, endTag: string, entire?: boolean | undefined) {
    const regex = new RegExp(`${startTag}((?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*[^{}]*\\})*\\})*)*${endTag}`, 'g');
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (entire) matches.push(match[0]);
        else matches.push(match[1]);
    }
    return matches;
}

function testArg(arg: string) {
    return (/\[\$\d+\]|\[\$\d+\-\d+\]|\[\$\d+\+\]|\{(.+)\}|\[range\]|\[range\d+\]|\[choice\]|\[choice\d+\]|\[choicevalue\]|\[choicevalue\d+\]/).test(arg)
}

export { variables, functions, matches, getVars, testArg }