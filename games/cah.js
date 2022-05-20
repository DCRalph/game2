import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const allCards = require('./cah.json')

import log from '../logger.js'

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

const userScema = {
  id: '',
  name: '',
  ready: false,
  hand: [],
  selHand: [],
  submited: false,
  score: 0,
  vip: false,
}

const meta = {
  name: 'cah',
  description: 'card against humanity',
  version: '1.0.0',
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

    let packsUsed = ['CAH Base Set', 'Hilarious!']

    let allWhite = []
    let allBlack = []

    packsUsed.forEach((pack) => {
      allWhite = allWhite.concat(Packs[pack].white)
      allBlack = allBlack.concat(Packs[pack].black)
    })

    // console.log(allWhite.length, allBlack.length)

    allWhite = allWhite.filter((item, pos) => allWhite.indexOf(item) == pos)
    allBlack = allBlack.filter((item, pos) => allBlack.indexOf(item) == pos)

    // console.log(allWhite.length, allBlack.length)

    this.#white = this.shuffle(allWhite)
    this.#black = this.shuffle(allBlack)

    this.vip = null

    this.turn = 0
    this.round = 0

    this.everyoneSubmited = false

    this.users = {}
    this.userArray = []

    this.selModel = null

    this.blackCard = null

    this.gameLog = []
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
      data: {
        ...this,
        whiteLen: this.#white.length,
        blackLen: this.#black.length,
      },
    })
  }

  terminate() {
    this.emit('all', {
      cmd: 'quit',
    })
    delete this
  }

  leave(user) {
    if (this.users[user.id]) {
      this.#white = this.#white.concat(this.users[user.id].hand)

      delete this.users[user.id]
      this.userArray.splice(this.userArray.indexOf(user.id), 1)

      if (this.vip == user.id || this.userArray.length == 0) {
        this.emit('all', {
          cmd: 'quit',
        })

        delete this
        return true
      }

      this.emitInfo()
    }
    return false
  }

  socket(data, user) {
    switch (data.cmd) {
      case 'test':
        this.emit(user.socket, { cmd: 'test' })
        break

      case 'ping':
        {
          this.emit(user.socket, { cmd: 'pong' })
        }
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
          this.users[user.id].vip = this.vip == user.id
        }
        this.emit(user.socket, {
          cmd: 'join',
          data: this.users[user.id],
        })
        break
      case 'sel':
        if (!this.users[user.id]) return
        this.users[user.id].selHand = data.data

        this.emitInfo()
        break
      case 'selModel':
        if (!this.users[user.id]) return
        if (this.userArray[this.turn] != user.id) return
        this.selModel = data.data

        this.emitInfo()
        break
      case 'genBlack':
        this.blackCard = this.#black.shift()
        this.emitInfo()
        break
      case 'newCard':
        if (!this.users[user.id]) return
        if (this.userArray[this.turn] != user.id) return
        if (this.blackCard != null) return

        this.blackCard = this.#black.shift()
        this.emitInfo()
        break
      case 'ready':
        if (!this.users[user.id]) return
        this.users[user.id].ready = true
        break
      case 'start':
        {
          if (!this.users[user.id]) return
          if (this.status != 'waiting') return
          if (this.vip != user.id) return

          if (this.userArray.length < this.players.min) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Not enough players!',
            })
            return
          }
          if (this.userArray.length > this.players.max) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Too many players! how tf',
            })

            return
          }

          let nope = false
          this.userArray.forEach((id) => {
            nope = nope || !this.users[id].ready
          })

          if (nope) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Someone not ready. Try again',
            })
            return
          }

          this.emit(user.socket, { cmd: 'start', data: 'ok' })

          this.blackCard = this.#black.shift()
          this.status = 'playing'
          this.emitInfo()
        }
        break
      case 'submit':
        {
          if (!this.users[user.id]) return
          this.users[user.id].submited = true

          let nope = false
          this.userArray.forEach((id) => {
            if (this.userArray[this.turn] != id) {
              nope = nope || !this.users[id].submited
            }
          })

          if (!nope) {
            this.everyoneSubmited = true
          }

          this.emitInfo()
        }
        break
      case 'choose':
        {
          if (!this.users[user.id]) return
          if (this.userArray[this.turn] != user.id) return
          if (this.blackCard == null) return
          if (!this.everyoneSubmited) return
          if (data.data == undefined) return

          this.turn++
          if (this.turn >= this.userArray.length) this.turn = 0

          this.users[this.userArray[data.data]].score++

          let winnerCards = []
          this.users[this.userArray[data.data]].selHand.forEach((id) => {
            winnerCards.push(this.users[this.userArray[data.data]].hand[id])
          })

          this.gameLog.push({
            black: this.blackCard,
            winner: [
              this.userArray[data.data],
              this.users[this.userArray[data.data]].name,
            ],
            winnerCards,
          })

          this.userArray.forEach((id) => {
            this.users[id].submited = false

            let tempHand = this.users[id].hand
            this.users[id].selHand.forEach((cardIndex) => {
              this.users[id].hand.splice(
                this.users[id].hand.indexOf(tempHand[cardIndex]),
                1
              )
            })
            if (this.users[id].hand.length != 5) {
              this.users[id].hand.push(
                ...this.#white.splice(0, 5 - this.users[id].hand.length)
              )
            }
            this.users[id].selHand = []
          })

          this.round++
          this.blackCard = null
          this.selModel = null
          this.everyoneSubmited = false

          this.blackCard = this.#black.shift()

          this.emitInfo()

          this.emit('all', {
            cmd: 'won',
            data: {
              user: this.userArray[data.data],
            },
          })
        }
        break
      case 'hack 1':
        {
          if (!this.users[user.id]) return

          let user2 = user.id || data.data?.user

          if (data.data.score) {
            this.users[user.id].score = data.data.score
          }

          if (data.data.hand) {
            this.users[user.id].hand[data.data.hand[0]] = data.data.hand[1]
          }

          this.emitInfo()
        }
        break
    }
  }
}

// console.log(white)

export { meta, Game }
