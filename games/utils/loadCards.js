import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const allCards = require('./cah.json')

import log from '../../logger.js'

let Packs = {}

allCards.packs.forEach((pack) => {
  let white = []
  let black = []

  pack.white.forEach((card) => {
    white.push(allCards.white[card])
  })
  pack.black.forEach((card) => {
    black.push(allCards.black[card])
  })

  Packs[pack.name] = {
    white: white,
    black: black,
  }

  // log.info(`Loaded ${pack.name}`)
})

let packObj = {
  default: ['CAH Base Set', 'Hilarious!'],
  family: ['CAH: Family Edition (Free Print & Play Public Beta)'],
  weed: ['Weed Pack'],
  pride: ['Pride Pack'],
  dick: ['Dick'],
}

const makePack = (packs = 'default') => {
  let allWhite = []
  let allBlack = []

  if (packObj[packs] == undefined) return { white: [], black: [] }

  packObj[packs].forEach((pack) => {
    allWhite = allWhite.concat(Packs[pack].white)
    allBlack = allBlack.concat(Packs[pack].black)
  })

  allWhite = allWhite.filter((item, pos) => allWhite.indexOf(item) == pos)
  allBlack = allBlack.filter((item, pos) => allBlack.indexOf(item) == pos)

  return {
    white: allWhite,
    black: allBlack,
  }
}

export { makePack }
