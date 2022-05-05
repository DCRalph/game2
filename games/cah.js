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

    this.white = this.shuffle(white)
    this.black = this.shuffle(black)

    console.log('new game')
  }

  shuffle(array) {
    let currentIndex = array.length
    let temporaryValue
    let randomIndex

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
  }

  fn() {
    console.log(69)
  }

  emit(who, data = null) {
    console.log(who)
    if (who == 'all') {
      this.#io.to(this.roomid).emit('game', data)
    } else {
      this.#io.to(who).emit('game', data)
    }
  }

  socket(data, user) {
    console.log(data)

    switch (data.cmd) {
      case 'test':
        this.emit(user.socket, { cmd: 'test' })
        break

      case 'pack':
        // if (data.color == 'white') {
        // }
        this.emit(user.socket, {
          cmd: 'pack',
          data: { white: this.white, black: this.black },
        })
    }
  }
}

// console.log(white)

export { meta, Game }
