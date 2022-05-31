const userScema = {
  id: '',
  name: '',
  ready: false,
  hand: [],
  score: 0,
  vip: false,
}

const meta = {
  name: 'Blackjack',
  description: 'Blackjack',
  version: '1.0.0',
}

class Game {
  #io

  constructor(roomid, io, args) {
    this.roomid = roomid
    this.#io = io

    this.name = 'Blackjack'
    this.file = 'blackjack.html'
    this.players = {
      min: 2,
      max: 4,
    }
    this.status = 'waiting'

    this.users = {}
    this.userArray = []
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
        {
          this.emit(user.socket, { cmd: 'test' })
        }
        break

      case 'ping':
        {
          this.emit(user.socket, { cmd: 'pong' })
        }
        break
      case 'info':
        {
          this.emitInfo()
        }
        break

      case 'join':
        {
          if (!this.users[user.id]) {
            this.users[user.id] = structuredClone(userScema)
            this.users[user.id].id = user.id
            this.users[user.id].name = user.name

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
        }
        break
      case 'ready':
        {
          if (!this.users[user.id]) return
          this.users[user.id].ready = true
        }
        break
    }
  }
}

export { meta, Game }
