import { Message, ChatInputCommandInteraction, GuildMember, User, BaseInteraction } from 'discord.js';

export type VariableType = {
    name: string,
    value: string | null | undefined
}

/**
 * Dónde puede usarse una variable o función. Los `{...}` sólo se interpretan cuando el texto
 * pasa por `Functions.createAutoresponder()` (autoresponder, mensaje, respuesta de botón y de
 * selectmenu). El comando `/embed` NO pasa por ahí: sólo reemplaza variables simples como
 * `{user}` o `{server_name}` (ver `Functions.replaceEmbedFields`/`replaceVars`), así que las
 * funciones (`{choose:}`, `{button:}`, etc.) no funcionan dentro de un embed creado con `/embed`.
 */
const CONTEXT_AUTORESPONDER = 'Autoresponder'
const CONTEXT_MESSAGE = 'Mensaje'
const CONTEXT_BUTTON = 'Botón'
const CONTEXT_SELECTMENU = 'Selectmenu'
const CONTEXT_EMBED = 'Embed'

/** Variables simples (`{user}`, `{server_name}`, ...): funcionan en cualquier lugar donde se reemplacen variables, incluido `/embed`. */
const USABLE_EVERYWHERE = [CONTEXT_AUTORESPONDER, CONTEXT_MESSAGE, CONTEXT_BUTTON, CONTEXT_SELECTMENU, CONTEXT_EMBED]
/** Funciones que se resuelven en `Functions.executeAutoresponder` y en `Functions.executeReply`: autoresponder, mensaje, botón y selectmenu (pero no `/embed`). */
const USABLE_IN_REPLIES = [CONTEXT_AUTORESPONDER, CONTEXT_MESSAGE, CONTEXT_BUTTON, CONTEXT_SELECTMENU]
/** Funciones que dependen del "trigger" del autoresponder (mensaje original, argumentos, cooldown, etc.) y sólo se resuelven en `executeAutoresponder`. */
const USABLE_ONLY_AUTORESPONDER = [CONTEXT_AUTORESPONDER]

const variables = (input: Message | ChatInputCommandInteraction | GuildMember | BaseInteraction) => {

    return {
        user: {
            title: 'Información del usuario/autor',
            vars: [
                {
                    "name": "{user}",
                    "value": input instanceof Message ? `<@${input.author.id}>` : `<@${input.user.id}>`,
                    description: "Menciona al usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_tag}",
                    "value": input instanceof Message ? input.author.tag : input.user.tag,
                    description: "Muestra el nombre de usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_name}",
                    "value": input instanceof Message ? input.author.username : input.user.username,
                    description: "Muestra el nombre de usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_avatar}",
                    "value": input instanceof Message ? input.author?.avatarURL({ size: 1024 }) : input.user?.avatarURL({ size: 1024 }),
                    description: "Muestra el ávatar del usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_discrim}",
                    "value": input instanceof Message ? input.author?.discriminator : input.user?.discriminator,
                    description: "Muestra el nombre del usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_id}",
                    "value": input instanceof Message ? input.author?.id : input.user?.id || input.id,
                    description: "Muestra el id del usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_nick}",
                    "value": input instanceof GuildMember ? input?.displayName : (input.member as GuildMember)?.displayName,
                    description: "Muestra el nick o apodo del usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_joindate}",
                    "value": input instanceof GuildMember ? `${input?.joinedAt?.toLocaleDateString()}` : `${(input.member as GuildMember)?.joinedAt?.toLocaleDateString()}`,
                    description: "Muestra la fecha en la que el usuario se unió al servidor",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_createdate}",
                    "value": input instanceof Message ? `${input.author?.createdAt?.toLocaleDateString()}` : `${input.user?.createdAt?.toLocaleDateString()}`,
                    description: "Muestra la fecha en la que el usuario se unió a Discord",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_displaycolor}",
                    "value": input instanceof GuildMember ? input.displayHexColor : (input.member as GuildMember)?.displayHexColor,
                    description: "Muestra el color del usuario",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{user_boostsince}",
                    "value": input instanceof GuildMember ? input.premiumSince : (input.member as GuildMember)?.premiumSince || 'sin datos',
                    description: "Muestra la fecha en la que el usuario ha boosteado el servidor",
                    usableIn: USABLE_EVERYWHERE
                }]
        },
        server: {
            title: 'Información del servidor',
            vars: [
                {
                    "name": "{server_name}",
                    "value": input.guild?.name,
                    description: "Muestra el nombre del servidor",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{server_id}",
                    "value": input.guild?.id,
                    description: "Muestra el id del servidor",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{server_membercount}",
                    "value": `${input.guild?.memberCount}` || '0',
                    description: "Muestra la cantidad de miembros del servidor",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{server_membercount_nobots}",
                    "value": `${input.guild?.members.cache.filter((member: { user: { bot: any; }; }) => !member.user.bot).size}` || '0',
                    description: "Muestra la cantidad de miembros del servidor que no son bots",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{server_botcount}",
                    "value": `${input.guild?.members.cache.filter((member: { user: { bot: any; }; }) => member.user.bot).size}` || '0',
                    description: "Muestra la cantidad de bots del servidor",
                    usableIn: USABLE_EVERYWHERE
                },
                {
                    "name": "{server_icon}",
                    "value": input.guild?.iconURL({ size: 1024 }),
                    description: "Muestra el ícono del servidor",
                    usableIn: USABLE_EVERYWHERE
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
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica los únicos usuarios que podrán ejecutar el autoresponder',
        uso: '\`{requireuser:@mención}\`'
    },
    {
        name: '{dm}',
        type: 'Tipos de respuesta',
        usableIn: USABLE_IN_REPLIES,
        description: 'Envía la respuesta al DM del autor',
        uso: '\`{dm}\`'
    },
    {
        name: '{sendto:}',
        type: 'Tipos de respuesta',
        usableIn: USABLE_IN_REPLIES,
        description: 'Envía la respuesta a un canal específico',
        uso: '\`{sendto:#canal}\`'
    },
    {
        name: '{requirechannel:}',
        type: 'Permisos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica los únicos canales donde se ejecutará el autorresponder',
        uso: '\`{requirechannel:#channel}\`'
    },
    {
        name: '{denychannel:}',
        type: 'Permisos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica los canales donde **NO** se ejecutará el autorresponder',
        uso: '\`{denychannel:#channel}\`'
    },
    {
        name: '{requirerole:}',
        type: 'Permisos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica los roles que deben tener los usuarios que ejecutarán el autorresponder',
        uso: '\`{requirerole:@role}\`'
    },
    {
        name: '{denyrole:}',
        type: 'Permisos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica los roles que **NO** deben tener los usuarios que ejecutarán el autorresponder',
        uso: '\`{denyrole:#channel}\`'
    },
    {
        name: '{requireperm:}',
        type: 'Permisos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Especifica el permiso que debe tener el usuario para poder ejecutar el autoresponder',
        uso: '\`{requireperm:<permiso>}\`',
        ejemplo: `\`{requireperm:Gestionar roles}\` \`{requireperm:Administrador}\``
    },
    {
        name: '{cooldown:}',
        type: 'Configuración',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Establece un tiempo de espera (en segundos) antes de que el mismo usuario pueda volver a ejecutar el autoresponder',
        uso: '\`{cooldown:<segundos>}\`',
        ejemplo: `\`{cooldown:10}\``
    },
    {
        name: '{requirearg:}',
        type: 'Configuración',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Obliga a que el usuario escriba cierta cantidad de argumentos (y opcionalmente su tipo) después del trigger para poder ejecutar el autoresponder. Esos argumentos se pueden insertar en la respuesta con \`[$N]\` (argumento N), \`[$N-M]\` (rango de argumentos) o \`[$N+]\` (desde el argumento N en adelante)',
        uso: '\`{requirearg:<número>}\` \`{requirearg:<número>|<user/channel/color/role/number>}\`',
        ejemplo: `\`{requirearg:1}\` \`{requirearg:2|user}\` con respuesta \`Hola [$1], mencionaste a [$2]\``
    },
    {
        name: '{waitresponse:}',
        type: 'Configuración',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Espera a que el autor responda con un mensaje específico en un canal, y envía una respuesta cuando lo detecta',
        uso: '\`{waitresponse:<tiempo>|<canal/current>|<respuesta a esperar>|<respuesta de la bot>}\`',
        ejemplo: `\`{waitresponse:30|current|si|¡Perfecto!}\``
    },
    {
        name: '{react:}',
        type: 'Misceláneos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Reacciona al mensaje del autor (el mensaje que activó el trigger) con un emoji específico',
        uso: '\`{react:<emoji>}\`',
        ejemplo: `\`{react:<:__:1095561613018419250>}\` \`{react:🤍}\``
    },
    {
        name: '{delete}',
        type: 'Misceláneos',
        usableIn: USABLE_ONLY_AUTORESPONDER,
        description: 'Elimina el mensaje del autor que activó el trigger',
        uso: '\`{delete}\`'
    },
    {
        name: '{embed:}',
        type: 'Tipos de respuesta',
        usableIn: USABLE_IN_REPLIES,
        description: 'Hace que la respuesta se envíe como un embed en lugar de texto plano. **No confundir** con el comando \`/embed\`: dentro de esa vista previa sólo funcionan las variables simples (\`{user}\`, \`{server_name}\`...), no esta función ni el resto de funciones de esta lista',
        uso: '\`{embed}\` (color por defecto) \`{embed:#000000}\` (color personalizado en código hex) \`{embed:<nombre_embed>}\` (usa un embed creado con \`/embed\`)'
    },
    {
        name: '{reactreply:}',
        type: 'Misceláneos',
        usableIn: USABLE_IN_REPLIES,
        description: 'Reacciona a la respuesta enviada por el bot con un emoji específico',
        uso: '\`{reactreply:<emoji>}\`',
        ejemplo: `\`{reactreply:<:__:1095561613018419250>}\` \`{reactreply:🤍}\``
    },
    {
        name: '{deletereply:}',
        type: 'Misceláneos',
        usableIn: USABLE_IN_REPLIES,
        description: 'Elimina la respuesta enviada por el bot pasado un tiempo',
        uso: '\`{deletereply:<tiempo de eliminación en segundos>}\`',
        ejemplo: `\`{deletereply:2}\``
    },
    {
        name: '{addrole:}',
        type: 'Misceláneos',
        usableIn: USABLE_IN_REPLIES,
        description: 'Añade un rol al usuario',
        uso: '\`{addrole:<@rol>}\` \`{addrole:<@rol>|<@usuario/[$N]>}\`',
        ejemplo: `\`{addrole:@miembro}\` \`{addrole:@moderador|@alys}\` \`{addrole:@moderador|[$1]}\``
    },
    {
        name: '{removerole:}',
        type: 'Misceláneos',
        usableIn: USABLE_IN_REPLIES,
        description: 'Remueve un rol del usuario',
        uso: '\`{removerole:<@rol>}\` \`{removerole:<@rol>|<@usuario/[$N]>}\`',
        ejemplo: `\`{removerole:@miembro}\` \`{removerole:@moderador|@alys}\` \`{removerole:@moderador|[$1]}\``
    },
    {
        name: '{setnick:}',
        type: 'Misceláneos',
        usableIn: USABLE_IN_REPLIES,
        description: 'Cambia el apodo del autor o de otro usuario',
        uso: '\`{setnick:<nick>}\` (autor) \`{setnick:<nick>|<@usuario/[$N]>}\` (otro usuario)',
        ejemplo: `\`{setnick:Chico nuevo}\` \`{setnick:Miembro|@alys}\``
    },
    {
        name: '{range:}',
        type: 'Interacción',
        usableIn: USABLE_IN_REPLIES,
        description: 'Genera un número aleatorio dentro de un rango. Se usa junto al placeholder \`[range]\` (o \`[range<número>]\` si hay varios rangos en la misma respuesta) donde quieras insertar el número generado',
        uso: '\`{range<número>:<mínimo>-<máximo>}\`',
        ejemplo: `\`{range:1-50}\` con \`[range]\` en la respuesta. Para varios: \`{range1:1-10} {range2:1-100}\` con \`[range1]\` y \`[range2]\``
    },
    {
        name: '{choose:}',
        type: 'Interacción',
        usableIn: USABLE_IN_REPLIES,
        description: 'Elige al azar una opción de una lista. Se usa junto al placeholder \`[choice]\` (o \`[choice<número>]\`) donde quieras insertar la opción elegida, o \`[choices]\` para listar todas las opciones disponibles',
        uso: '\`{choose<número>:<opcion1>|<opcion2>|<opcion3>}\`',
        ejemplo: `\`{choose: manzana|pera|uva}\` con \`[choice]\` en la respuesta`
    },
    {
        name: '{choosevalues:}',
        type: 'Interacción',
        usableIn: USABLE_IN_REPLIES,
        description: 'Asocia un valor a cada opción de un \`{choose}\` con el mismo índice (deben tener la misma cantidad de opciones, en el mismo orden). Se usa junto al placeholder \`[choicevalue]\` (o \`[choicevalue<número>]\`); el \`[choice]\` correspondiente debe aparecer antes en la respuesta para que el valor se resuelva bien',
        uso: '\`{choosevalues<número>:<valor1>|<valor2>|<valor3>}\`',
        ejemplo: `\`{choose: manzana|pera} {choosevalues: 5|10}\` con respuesta \`Elegiste [choice] y ganaste $[choicevalue]\``
    },
    {
        name: '{font:}',
        type: 'Personalización',
        usableIn: USABLE_IN_REPLIES,
        description: 'Aplica una fuente estilizada (unicode) a todo el texto de la respuesta',
        uso: '\`{font}\` (fuente aleatoria) \`{font:<nombre_fuente>}\` (fuente específica)',
        ejemplo: `\`{font}\` \`{font:monospace.bold}\``
    },
    {
        name: '{button:}',
        type: 'Componentes',
        usableIn: USABLE_IN_REPLIES,
        description: 'Adjunta un botón previamente creado con \`/button create\` a la respuesta',
        uso: '\`{button:<nombre_del_botón>}\`',
        ejemplo: `\`{button:soporte}\``
    },
    {
        name: '{selectmenu:}',
        type: 'Componentes',
        usableIn: USABLE_IN_REPLIES,
        description: 'Adjunta un menú de selección previamente creado con \`/selectmenu create\` a la respuesta',
        uso: '\`{selectmenu:<nombre_del_selectmenu>}\`',
        ejemplo: `\`{selectmenu:roles}\``
    },
    {
        name: '{modifybal:}',
        type: 'Economía',
        usableIn: USABLE_IN_REPLIES,
        description: 'Suma o resta 🍞 al balance del autor o de otro usuario',
        uso: '\`{modifybal:<+/-cantidad>}\` (autor) \`{modifybal:<@usuario/[$N]>|<+/-cantidad>}\` (otro usuario)',
        ejemplo: `\`{modifybal:+50}\` \`{modifybal:@alys|-20}\``
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
