import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'

import logger from './logger.js'

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

logger.blank()
logger.info('Cards Against Humanity ' + logger.c.magenta('V' + VERSION))
logger.blank()

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
// console.log(files)
for (let file of files) {
  if (file.endsWith('.js') && !file.startsWith('_')) {
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

  user.name = req.body.name

  if (user.name == '' || user.name == undefined) {
    return res.json({ ok: false, err: 'Name is empty' })
  }

  // console.log(req.body)

  logger.info(
    'New game request from ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')')
  )

  let gameType = req.body.game
  let room = req.body.room
  let argsRaw = req.body.args
  let args = {}

  if (argsRaw == null || argsRaw == '') args = {}
  else {
    let argsArr = argsRaw.split(';')
    for (let arg of argsArr) {
      let key = arg.split('=')[0]
      let value = arg.split('=')[1]
      args[key] = value
    }
    // console.log(args)
    logger.debug(args)
  }

  if (user.room) {
    if (rooms[user.room]) {
      rooms[user.room].users.splice(rooms[user.room].users.indexOf(user.id), 1)
    }

    user.room = null
    logger.info(
      `User ${logger.c.magenta(user.name)} (${logger.c.yellow(
        user.id
      )}) left room`
    )
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
        logger.warn('Room is full')
        return
      } else if (rooms[room].game.status != 'waiting') {
        res.json({
          ok: false,
          error: 'Game is already started',
        })
        logger.warn('Game is already started')
        return
      } else {
        rooms[room].users.push(user.id)
        user.room = room
      }
    } else if (gameType != null) {
      let newRoom = {
        id: room,
        users: [user.id],
        game: new gamesObjs[gameType].Game(room, io, args),
        timer: null,
      }
      rooms[room] = newRoom
      user.room = room

      madeNewRoom = true

      logger.info('Made new room with custom id ' + logger.c.yellow(room))
    }
  } else {
    let newId = nanoid(8)
    let newRoom = {
      id: newId,
      users: [user.id],
      game: new gamesObjs[gameType].Game(newId, io, args),
      timer: null,
    }
    rooms[newRoom.id] = newRoom
    user.room = newRoom.id

    madeNewRoom = true

    logger.info('Made new room with generated id ' + logger.c.yellow(newId))
  }

  if (madeNewRoom) {
    rooms[user.room].timer = new Timer(() => {
      if (!rooms[user.room]) {
        logger.error('Room not found')
        return
      }

      try {
        let roomid = user.room
        rooms[roomid].timer.stop()

        logger.warn('del timer')
        logger.raw(rooms)
        logger.raw(user)
        logger.raw(roomid)

        rooms[roomid]?.game.terminate()

        rooms[roomid].users.forEach((userId) => {
          users[userId].room = null
        })

        rooms[roomid] = undefined
      } catch (error) {
        logger.error(error)
      }
    }, 1000 * 60 * 5)
    // }, 1000 * 10)
  }

  res.json({ ok: true, room: user.room })
  logger.info('Successfully created/joined game')
  logger.blank()
})

app.get('/exitGame', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)

  if (user == undefined) return res.redirect('/')
  if (user.room == undefined) return res.redirect('/')
  if (rooms[user.room] == undefined) return res.redirect('/')
  let game = rooms[user.room]

  logger.info(
    'Exit request from ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')')
  )

  if (game.game.leave(user)) {
    logger.info('Delete room ' + logger.c.yellow(user.room))
    game.timer.stop()
    delete rooms[user.room]
  }
  game.users.splice(game.users.indexOf(user.id), 1)

  user.room = null

  res.redirect('/')

  logger.info('Successfully left game')
  logger.blank()
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

  logger.info(
    'Game request from ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')') +
      ' in room ' +
      logger.c.yellow(roomId)
  )

  if (rooms[roomId]) {
    let path = __dirname + '/public/' + rooms[roomId].game.file

    if (fs.existsSync(path)) {
      logger.info('Successfully sent game')
      logger.blank()
      return res.status(200).sendFile(path)
    }
    logger.info('Game file not found')
    logger.blank()
    return res
      .status(404)
      .json({ err: '404 File Not Found', file: req.params.file })
  } else {
    logger.warn('Room not found')
    logger.blank()
    users[user.id].room = null
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

  logger.info('User connected to socket')

  let token = cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') {
    logger.warn('User not found')
    return socket.disconnect()
  }

  users[user.id].socket = socket.id

  socket.join(user.room)

  logger.info(
    'User ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')') +
      ' connected to room socket ' +
      logger.c.yellow(user.room)
  )
  logger.blank()
  // socket.on('ping', () => {
  //   socket.emit('pong')
  //   if (rooms[user.room] != undefined) {
  //     rooms[user.room].timer.reset()
  //   }
  // })

  socket.on('game', (data) => {
    if (rooms[user.room] != undefined) {
      rooms[user.room].game.socket(data, user)
      rooms[user.room].timer.reset()
    }
  })

  socket.on('disconnect', () => {
    if (user?.room && 1 == 2) {
      let game = rooms[user.room]
      if (game.game.leave(user)) delete rooms[user.room]

      game.users.splice(game.users.indexOf(user.id), 1)

      user.room = null
    }

    logger.info(
      'User ' +
        logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')') +
        ' disconnected from room socket'
    )
    logger.blank()

    users[user.id].socket = null
    socket.leave(user.room)
  })
})

httpServer.listen(PORT, () => {
  // console.log(server.address())

  logger.info(`Server started on port ${logger.c.green(PORT)}`)
  logger.blank()
})
