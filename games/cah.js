import { createRequire } from 'module'
import { start } from 'repl'
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

  won: [],
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

    this.everyoneSubmited = false

    this.users = {}
    this.userArray = []

    this.selModel = null

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
        this.emit('all', {
          cmd: 'quit',
          data: {},
        })

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

        if(data.data.card){
          this.blackCard = {text: data.data.card[0], pick: data.data.card[1]}
        } else this.blackCard = this.#black.shift()
        
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
            this.emit(user.socket, { cmd: 'start', data: 'not enough' })

            return
          }
          if (this.userArray.length > this.players.max) {
            this.emit(user.socket, { cmd: 'start', data: 'too many' })

            return
          }

          let nope = false
          this.userArray.forEach((id) => {
            nope = nope || !this.users[id].ready
          })

          if (nope) {
            this.emit(user.socket, { cmd: 'start', data: 'someone not ready' })
            return
          }

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

          this.turn++
          if (this.turn >= this.userArray.length) this.turn = 0

          this.users[this.userArray[data.data]]?.score++

          let winnerCards = []
          this.users[this.userArray[data.data]].selHand.forEach((id) => {
            winnerCards.push(this.users[this.userArray[data.data]].hand[id])
          })

          this.users[this.userArray[data.data]].won.push([
            this.blackCard,
            winnerCards,
          ])

          this.userArray.forEach((id) => {
            this.users[id].submited = false

            let tempHand = this.users[id].hand
            this.users[id].selHand.forEach((cardIndex) => {
              this.users[id].hand.splice(this.users[id].hand.indexOf(tempHand[cardIndex]), 1)
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

          this.emit('all', {
            cmd: 'won',
            data: {
              user: this.users[this.userArray[data.data]],
            },
          })

          this.emitInfo()
        }
        break
        case 'hack 1':
        {
          if (!this.users[user.id]) return

          let user2 = user.id || data.data?.user

          if(data.data.score){
            this.users[user.id].score = data.data.score
          }

          if(data.data.hand){
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
