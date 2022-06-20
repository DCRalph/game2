import { makePack } from './utils/loadCards.js'
import logger from '../logger.js'

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
  name: 'Cards Against Humanity',
  description: 'card against humanity',
  version: '1.0.0',
}

class Game {
  #io
  #white
  #black
  constructor(roomid, io, args) {
    this.roomid = roomid
    this.#io = io

    this.name = 'Cards Against Humanity'
    this.file = 'cah.html'
    this.players = {
      min: 2,
      max: parseInt(args.maxP) || 10,
    }
    this.status = 'waiting'

    this.pack = args.pack || 'default'

    let pack = makePack(this.pack)

    this.#white = this.shuffle(pack.white)
    this.#black = this.shuffle(pack.black)

    this.vip = null

    this.turn = 0
    this.round = 0

    this.everyoneSubmited = false

    this.users = {}
    this.userArray = []

    this.selModel = null

    this.blackCard = null

    this.gameLog = []

    logger.event(this, 'Game created')
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
    logger.debug(this, 'fn 69')
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

        logger.event(this, 'Game deleted')

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
        {
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

          logger.event(
            this,
            `${logger.c.magenta(
              `${user.name} (${logger.c.cyan(user.id)})`
            )} joined`
          )
          logger.blank()
        }
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
        {
          if (!this.users[user.id]) return
          this.users[user.id].ready = true
        }
        break
      case 'start':
        {
          if (!this.users[user.id]) return
          if (this.status != 'waiting') return
          if (this.vip != user.id) return

          logger.event(this, 'Attempting to start game')

          if (this.userArray.length < this.players.min) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Not enough players!',
            })
            logger.event(this, 'Not enough players!')
            return
          }
          if (this.userArray.length > this.players.max) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Too many players! how tf',
            })
            logger.event(this, 'Too many players! how tf')
            return
          }

          // let nope = false
          // this.userArray.forEach((id) => {
          //   nope = nope || !this.users[id].ready
          // })

          let everyoneReady = this.userArray.every((id) => this.users[id].ready)

          if (!everyoneReady) {
            this.emit(user.socket, {
              cmd: 'start',
              data: 'Someone not ready. Try again',
            })
            logger.event(this, 'Someone not ready')
            return
          }

          this.emit(user.socket, { cmd: 'start', data: 'ok' })

          this.blackCard = this.#black.shift()
          this.status = 'playing'
          this.emitInfo()

          logger.event(this, 'Successfully started game')
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
            white: winnerCards,
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
          // return
          if (!this.users[user.id]) return

          let user2 = data.data?.user || user.id

          if (data.data.score) {
            this.users[user2].score = data.data.score
          }

          if (data.data.hand) {
            this.users[user2].hand[data.data.hand[0]] = data.data.hand[1]
          }

          this.emitInfo()
        }
        break
    }
  }
}

export { meta, Game }
