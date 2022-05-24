const meta = {
  name: 'Template',
  description: 'Template',
  version: '0.0.0',
}

class Game {
  #io

  constructor(roomid, io, args) {
    this.roomid = roomid
    this.#io = io

    this.name = ''
    this.file = ''
    this.players = {
      min: 2,
      max: 10,
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
    }
  }
}

export { meta, Game }
