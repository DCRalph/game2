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

const meta = {
  name: 'cah',
  description: 'card against humanity',
  version: '0.0.1',
}

class Game {
  #io
  constructor(roomid, io) {
    this.roomid = roomid
    this.#io = io

    this.name = 'Cards Against Humanity'
    this.file = 'cah.html'
    this.players = {
      min: 2,
      max: 10,
    }
    this.status = 'waiting'

    console.log('new game')
  }

  fn() {
    console.log(69)
  }

  socket(data) {
    console.log(data)

    switch (data.cmd) {
      case 'test':
        console.log('test')
        io.to(this.roomid).emit('test')
        break

      case 'newcard':
        console.log('newcard')
        if (data.color == 'white') {
          // TODO random card
        }
    }
  }
}

// console.log(white)

export { meta, Game }
