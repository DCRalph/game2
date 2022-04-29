import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const data = require('../cah.json')

let pack = data.packs.find((pack) => pack.name === 'CAH Base Set')
let white = []
let black = []

pack.white.forEach((card) => {
  white.push(data.white[card])
})
pack.black.forEach((card) => {
  black.push(data.black[card])
})

console.log(black)

const loop = () => {
  console.log('loop')
}

export default {
  e: 9,
}
