import { createRequire } from 'module'
import { urlToHttpOptions } from 'url'
const require = createRequire(import.meta.url)
const data = require('./cah.json')

import log from '../logger.js'

let pack = data.packs.find((pack) => pack.name === 'CAH Base Set')
let white = []
let black = []

const userScema = {
  id: '',
  name: '',
  ready: false,
  hand: [],
  selHand: [],
  submited: false,
  score: 0,
  isHost: false,
  isWinner: false,
}

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
  #white
  #black
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

    this.#white = this.shuffle(structuredClone(white))
    this.#black = this.shuffle(structuredClone(black))

    this.vip = null

    this.turn = 0
    this.round = 0

    this.users = {}
    this.userArray = []

    this.blackCard = null

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
    if (who == 'all') {
      this.#io.to(this.roomid).emit('game', data)
    } else {
      this.#io.to(who).emit('game', data)
    }
  }

  emitInfo() {
    this.emit('all', {
      cmd: 'info',
      data: this,
    })
  }

  leave(user) {
    if (this.users[user.id]) {
      this.#white = this.#white.concat(this.users[user.id].hand)

      delete this.users[user.id]
      this.userArray.splice(this.userArray.indexOf(user.id), 1)

      if (this.vip == user.id || this.userArray.length == 0) {
        delete this
        return true
      }
    }
    return false
  }

  socket(data, user) {
    switch (data.cmd) {
      case 'test':
        this.emit(user.socket, { cmd: 'test' })
        break

      case 'info':
        this.emitInfo()
        break

      case 'join':
        if (!this.users[user.id]) {
          this.users[user.id] = structuredClone(userScema)
          this.users[user.id].id = user.id
          this.users[user.id].name = user.name
          this.users[user.id].hand = this.#white.splice(0, 5)

          this.userArray.push(user.id)
          if (this.vip == null) {
            this.vip = user.id
          }
          this.users[user.id].isHost = this.vip == user.id
        }
        this.emit(user.socket, {
          cmd: 'join',
          data: this.users[user.id],
        })
        break
      case 'sel':
        if (this.users[user.id]) {
          this.users[user.id].selHand = data.data
        }
        this.emitInfo()
        break
      case 'genBlack':
        this.blackCard = this.#black.shift()
        this.emitInfo()
        break
      case 'submit':
        if (this.users[user.id]) {
          this.users[user.id].submited = true
        }
        this.emitInfo()
        break
    }
  }
}

// console.log(white)

export { meta, Game }
