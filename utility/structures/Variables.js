const { Message, ChatInputCommandInteraction, GuildMember } = require('discord.js');

/**
 * @param {Message | ChatInputCommandInteraction | GuildMember} input
 */
const variables = (input) => {
  return {
    user: {
      title: 'Información del usuario/autor',
      vars: [
        {
          "name": "{user}",
          "value": input.author ? `<@${input.author.id}>` : `<@${input.user?.id}>` || ''
        },
        {
          "name": "{user_tag}",
          "value": input.author?.tag || input.user?.tag || ''
        },
        {
          "name": "{user_name}",
          "value": input.author?.username || input.user?.username || ''
        },
        {
          "name": "{user_avatar}",
          "value": input.author?.avatarURL({ dynamic: true, size: 1024 }) || input.user?.avatarURL({ dynamic: true, size: 1024 }) || ''
        },
        {
          "name": "{user_discrim}",
          "value": input.author?.discriminator || input.user?.discriminator || ''
        },
        {
          "name": "{user_id}",
          "value": input.author?.id || input.user?.id || input.id || ''
        },
        {
          "name": "{user_nick}",
          "value": input.member?.displayName || input?.displayName || ''
        },
        {
          "name": "{user_joindate}",
          "value": input.member?.joinedAt?.toLocaleDateString() || input?.joinedAt?.toLocaleDateString() || ''
        },
        {
          "name": "{user_createdate}",
          "value": input.author?.createdAt?.toLocaleDateString() || input.user?.createdAt?.toLocaleDateString() || ''
        },
        {
          "name": "{user_displaycolor}",
          "value": input.member?.displayHexColor || input.displayHexColor || ''
        },
        {
          "name": "{user_boostsince}",
          "value": input.member?.premiumSince || input.premiumSince || '**no premium**'
        }]
    },
    server: {
      title: 'Información del servidor',
      vars: [
        {
          "name": "{server_name}",
          "value": input.guild?.name || ''
        },
        {
          "name": "{server_id}",
          "value": input.guild?.id || ''
        },
        {
          "name": "{server_membercount}",
          "value": input.guild?.memberCount || 0
        },
        {
          "name": "{server_membercount_nobots}",
          "value": input.guild?.members.cache.filter(member => !member.user.bot).size || 0
        },
        {
          "name": "{server_botcount}",
          "value": input.guild?.members.cache.filter(member => member.user.bot).size || 0
        },
        {
          "name": "{server_icon}",
          "value": input.guild?.iconURL({ dynamic: true, size: 1024 }) || ''
        }
      ]
    },
    totalvars() {
      return this.server.vars.concat(this.user.vars)
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

module.exports = { variables, functions, matches }