import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'

import path from 'path'
import { fileURLToPath } from 'url'

import fs from 'fs'

import { nanoid } from 'nanoid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const PORT = 3001
const VERSION = require('./package.json').version

console.log('Cards Against Humanity v' + VERSION)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

app.use(express.json())
app.use(cookieParser())

let users = {}
let rooms = {}
let games = []
let gamesObjs = {}

let files = fs.readdirSync('./games')
for (let file of files) {
  if (file.endsWith('.js')) {
    let game = await import(`./games/${file}`)
    gamesObjs[game.meta.name] = game
    games.push(game.meta.name)
  }
}

// console.log(gamesObjs)

const validateUser = (tok) => {
  if (users[tok]) {
    return users[tok]
  } else {
    let newUser = {
      id: tok || nanoid(16),
      room: null,
      name: null,
      socket: null,
    }
    users[newUser.id] = newUser
    return newUser
  }
}

const getUser = (tok) => {
  return users[tok]
}

class Timer {
  #timer
  constructor(fn, t, state = true) {
    this.fn = fn
    this.t = t
    this.state = state
    if (this.state) this.#timer = setInterval(fn, t)
  }

  stop = () => {
    if (this.state) {
      this.state = false
      clearInterval(this.#timer)
    }
  }

  start = () => {
    if (!this.state) {
      this.state = true
      this.#timer = setInterval(this.fn, this.t)
    }
  }

  reset = (nt = this.t) => {
    // console.log('reset', this.#timer)
    this.t = nt
    this.stop()
    this.start()
    // console.log(this.#timer)
  }
}

app.get('/admin', (req, res) => {
  let obj = {
    users,
    rooms,
  }

  res.json(obj)
})

app.get('/', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)
  res.cookie('token', user.id, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
  })

  // console.log(users)

  res.sendFile(__dirname + '/public/index.html')
})

app.get('/tailwind.css', (req, res) => {
  res.sendFile(__dirname + '/public/tailwind.css')
})

app.get('/userData', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.json({ ok: false })

  let sendRooms = []
  for (let room in rooms) {
    if (rooms[room] == undefined) continue
    let roomObj = {
      id: rooms[room].id,
      users: rooms[room].users.length,
      name: rooms[room].game.name,
    }

    sendRooms.push(roomObj)
  }

  res.json({ version: VERSION, games, user, sendRooms })
})

app.post('/newgame', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)

  // console.log(req.body)

  let gameType = req.body.game
  let room = req.body.room

  user.name = req.body.name

  if (user.name == '' || user.name == null) {
    return res.json({ ok: false, err: 'Name is empty' })
  }

  if (user.room) {
    if (rooms[user.room]) {
      rooms[user.room].users.splice(rooms[user.room].users.indexOf(user.id), 1)
    }

    user.room = null
  }

  if (!gamesObjs[gameType] && !room) {
    res.json({
      ok: false,
      error: 'Game type not found',
    })
    return
  }

  let madeNewRoom = false

  if (room) {
    if (rooms[room]) {
      if (rooms[room].users.length >= rooms[room].game.players.max) {
        res.json({
          ok: false,
          error: 'Room is full',
        })
        return
      } else if (rooms[room].game.status != 'waiting') {
        res.json({
          ok: false,
          error: 'Game is already started',
        })
        return
      } else {
        rooms[room].users.push(user.id)
        user.room = room
      }
    } else if (gameType != null) {
      let newRoom = {
        id: room,
        users: [user.id],
        game: new gamesObjs[gameType].Game(room, io),
        timer: null,
      }
      rooms[room] = newRoom
      user.room = room

      madeNewRoom = true
    }
  } else {
    let newId = nanoid(8)
    let newRoom = {
      id: newId,
      users: [user.id],
      game: new gamesObjs[gameType].Game(newId, io),
      timer: null,
    }
    rooms[newRoom.id] = newRoom
    user.room = newRoom.id

    madeNewRoom = true
  }

  if (madeNewRoom) {
    rooms[user.room].timer = new Timer(() => {
      console.log('del timer')
      console.log(rooms)
      console.log(user)
      let roomid = user.room
      rooms[roomid].game.terminate()

      rooms[roomid].users.forEach((userId) => {
        users[userId].room = null
      })

      rooms[roomid].timer.stop()
      // rooms[roomid].timer = undefined
      rooms[roomid] = undefined
      // delete rooms[roomid]
    }, 1000 * 20)
  }

  res.json({ ok: true, room: user.room })
})

app.get('/exitGame', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)

  if (user == undefined) return res.redirect('/')
  if (user.room == null) return res.redirect('/')
  if (rooms[user.room] == undefined) return res.redirect('/')
  let game = rooms[user.room]

  if (game.game.leave(user)) {
    game.timer.stop()
    delete rooms[user.room]
  }
  game.users.splice(game.users.indexOf(user.id), 1)

  user.room = null

  res.redirect('/')
})

app.get('/roomid', (req, res) => {
  let token = req.cookies.token
  let roomid = getUser(token)?.room || null
  res.json({ roomid })
})

app.get('/files/:file(*)', (req, res) => {
  if (req.params.file.split('')[0] == '_') {
    return res.status(404).json({ err: '404 File Not Found' })
  }

  let path = __dirname + '/public/files/' + req.params.file

  if (fs.existsSync(path)) {
    return res.status(200).sendFile(path)
  }
  return res
    .status(404)
    .json({ err: '404 File Not Found', file: req.params.file })
})

const handleGame = (req, res) => {
  const roomIdPram = req.params?.id

  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.redirect('/')

  const roomId = user.room

  if (roomId != roomIdPram && roomId != null) {
    return res.redirect('/game/' + roomId)
  }

  if (rooms[roomId]) {
    let path = __dirname + '/public/' + rooms[roomId].game.file

    if (fs.existsSync(path)) {
      return res.status(200).sendFile(path)
    }
    return res
      .status(404)
      .json({ err: '404 File Not Found', file: req.params.file })
  } else {
    users[user.id].room = undefined
    return res.redirect('/')
  }
}

app.get('/game', handleGame)
app.get('/game/:id', handleGame)

io.on('connection', (socket) => {
  let cookies = {}
  socket.handshake.headers.cookie.split(';').map((cookie) => {
    let [key, value] = cookie.split('=')
    key = key.trim()
    value = value.trim()
    cookies[key] = value
  })

  let token = cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return socket.disconnect()

  users[user.id].socket = socket.id

  socket.join(user.room)

  socket.on('ping', () => {
    socket.emit('pong')
    rooms[user.room]?.timer.reset()
  })

  socket.on('game', (data) => {
    if (rooms[user.room]) rooms[user.room]?.game.socket(data, user)
    rooms[user.room]?.timer.reset()
  })

  socket.on('disconnect', () => {
    if (user?.room && 1 == 2) {
      let game = rooms[user.room]
      if (game.game.leave(user)) delete rooms[user.room]

      game.users.splice(game.users.indexOf(user.id), 1)

      user.room = null
    }

    users[user.id].socket = null
    socket.leave(user.room)
  })
})

let server = httpServer.listen(PORT, () => {
  console.log(server.address())
})
