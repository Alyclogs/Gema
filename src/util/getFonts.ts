import { getAll } from 'lib-unifonts'

export const getFonts = function (str: string) {
    const fonts = getAll(str).filter(({ name }) =>
        !name.startsWith("asian") && !name.startsWith("indian") && !name.startsWith("a1z26")
        && !name.startsWith("flipped") && !name.startsWith("subscript") && !name.startsWith("russian")
        && !name.startsWith("just") && !name.startsWith("double") && !name.startsWith("arrow")
        && !name.startsWith("god") && !name.startsWith("hash") && !name.startsWith("star")
        && !name.startsWith("hearts") && !name.startsWith("wavy") && !name.startsWith("single")
        && !name.startsWith("zigzag") && !name.startsWith("dot") && !name.startsWith("connected")
        && !name.startsWith("dotty") && !name.startsWith("diametric") && !name.startsWith("weird")
        && !name.startsWith("curly") && !name.startsWith("squiggle")
    )
    return fonts
}