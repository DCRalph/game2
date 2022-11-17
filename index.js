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

const TIMEOUT = 1000 * 60 * 5

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
let currentTimer = 0
class Timer {
  #timer
  constructor(fnIn, t, state = true) {
    this.id = currentTimer++
    this.fn = () => {
      // logger.debug(`Timer ${this.id} running`)
      fnIn()
      logger.debug(`Timer ${this.id} executed`)
      logger.blank()
    }
    this.t = t
    this.state = state
    if (this.state) this.#timer = setInterval(this.fn, this.t)
    logger.debug(`Timer created: ${this.id} state: ${this.state}`)
  }

  stop = (log = true) => {
    if (log) logger.debug(`Timer ${this.id} stopped`)
    if (this.state) {
      this.state = false
      clearInterval(this.#timer)
    }
  }

  start = (log = true) => {
    if (log) logger.debug(`Timer ${this.id} started`)
    if (!this.state) {
      this.state = true
      this.#timer = setInterval(this.fn, this.t)
    }
  }

  reset = (nt = null, log = true) => {
    if (log) logger.debug(`Timer ${this.id} reset`)
    if (nt != null) this.t = nt
    this.stop(false)
    this.start(false)
  }
}

const objectMap = (object, mapFn) => {
  return Object.keys(object).reduce(function (result, key) {
    result[key] = mapFn(object[key])
    return result
  }, {})
}

const validateUser = (req) => {
  let tok = req.cookies.token
  if (users[tok]) {
    return users[tok]
  } else {
    let newUser = {
      id: tok || nanoid(16),
      room: null,
      name: null,
      socket: null,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      admin: false,
    }
    users[newUser.id] = newUser
    return newUser
  }
}

const getUser = (tok) => {
  return users[tok]
}

const findDeadRooms = () => {
  let deadRooms = []
  for (let room in rooms) {
    if (rooms[room].users.length == 0) {
      deadRooms.push([room, 'empty'])
      continue
    }
    if (
      Date.now() - rooms[room].createdAt > TIMEOUT &&
      rooms[room].users.length <= 1
    ) {
      deadRooms.push([room, 'timeout'])
      continue
    }
    if (Date.now() - rooms[room].lastActivity > TIMEOUT) {
      deadRooms.push([room, 'inactivity'])
      continue
    }
  }
  return deadRooms
}

const handelDeadRooms = () => {
  let deadRooms = findDeadRooms()

  // if (deadRooms.length > 0)
  logger.info('Dead rooms: ' + logger.c.magenta(deadRooms.length))

  deadRooms.forEach((room) => {
    logger.info(
      `Attempting to delete room ${logger.c.yellow(
        room[0]
      )}. Reason ${logger.c.yellow(room[1])}`
    )
    if (rooms[room[0]] != undefined) {
      logger.info('Room found')
      rooms[room[0]].game.terminate()

      rooms[room[0]].users.forEach((user) => {
        if (users[user.id] != undefined) {
          users[user.id].room = null
        }
      })
      delete rooms[room[0]]
      logger.info('Deleted room ' + logger.c.yellow(room[0]))
      logger.blank()
    }
  })
}

const deadGameTimer = new Timer(handelDeadRooms, TIMEOUT, false)

app.get('/admin', (req, res) => {
  let user = validateUser(req)
  if (user.admin) {
    res.sendFile(__dirname + '/admin/index.html')
  } else {
    res.status(401).send('Unauthorized')
  }
})

app.get('/admin.js', (req, res) => {
  let user = validateUser(req)
  if (user.admin) {
    res.sendFile(__dirname + '/admin/admin.js')
  } else {
    res.status(401).send('Unauthorized')
  }
})

app.get('/admindata', (req, res) => {
  let user = validateUser(req)
  if (user.admin) {
    let sendUsers = objectMap(users, (u) => {
      if (u.socket != null) u.socket = '[Hidden]'

      return u
    })

    let obj = {
      users: sendUsers,
      rooms,
    }

    res.json(obj)
  } else {
    res.status(401).send('Unauthorized')
  }
})

app.get('/', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(req)
  res.cookie('token', user.id, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
  })

  res.sendFile(__dirname + '/public/index.html')
})

app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/public/files/dcralph.png')
})

app.get('/tailwind.css', (req, res) => {
  res.sendFile(__dirname + '/public/tailwind.css')
})

app.get('/userData', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.json({ ok: false })

  let inGame = rooms[user.room] != undefined ? user.room : false

  let sendRooms = []
  for (let room in rooms) {
    if (rooms[room] == undefined) continue
    // if (rooms[user.room] == undefined) continue

    let users = rooms[room].users.map((user) => {
      return {
        id: user.id,
        name: user.name || '[Anonymous]',
      }
    })

    let roomObj = {
      id: rooms[room].id,
      users,
      name: rooms[room].game.name,
      status: rooms[room].game.status,
    }

    sendRooms.push(roomObj)
  }

  res.json({ version: VERSION, games, sendRooms, inGame })
})

app.post('/newgame', (req, res) => {
  let user = validateUser(req)

  user.name = req.body.name

  if (user.name == '' || user.name == undefined) {
    return res.json({ ok: false, error: 'Name is empty' })
  }

  let gameType = req.body.game
  let room = req.body.room
  let argsRaw = req.body.args
  let args = {}

  if (argsRaw == null || argsRaw == '') args = {}
  else {
    let argsArr = argsRaw.split(';')
    for (let arg of argsArr) {
      let key = arg.split('=')[0]
      let value = arg.split('=')[1] || ''
      args[key] = value
    }
    // console.log(args)
    // logger.debug(args)
  }

  if (args.admin != undefined) {
    if (args.admin == '123') {
      user.admin = !user.admin
      let text = user.admin ? 'enabled' : 'disabled'
      res.json({ ok: false, msg: `Admin mode ${text}` })
    } else {
      res.json({ ok: false, error: 'Admin mode failed' })
    }
    return
  }

  logger.info(
    'New game request from ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')')
  )

  if (user.room) {
    if (rooms[user.room]) {
      if (
        // rooms[user.room].game.status == 'playing' &&
        rooms[user.room].users.findIndex((u) => u.id == user.id) != -1
      ) {
        // rooms[user.room].users[
        //   rooms[user.room].users.findIndex((u) => u.id == user.id)
        // ].connected = false

        user.room = room
        logger.info('Joined room')

        res.json({ ok: true, room: user.room })

        return
      }

      rooms[user.room].users.splice(
        rooms[user.room].users.findIndex((u) => u.id == user.id),
        1
      )
    }

    if (user.room) {
      if (rooms[user.room]) {
        if (rooms[user.room].game.leave(user)) {
          logger.info('Delete room ' + logger.c.yellow(user.room))

          delete rooms[user.room]
        }
      } else {
        logger.info('Room not found')
      }
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
    logger.warn('Game type not found')
    return
  }

  logger.info('Game type: ' + logger.c.yellow(gameType))

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
        rooms[room].users.push({ id: user.id, connected: false })
        user.room = room
        logger.info('Joined room')
      }
    } else {
      let newRoom = {
        id: room,
        users: [{ id: user.id, connected: false }],
        game: new gamesObjs[gameType].Game(room, io, args),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      }
      rooms[room] = newRoom
      user.room = room

      logger.info('Made new room with custom id ' + logger.c.yellow(room))
    }
  } else {
    let newId = nanoid(8)
    let newRoom = {
      id: newId,
      users: [{ id: user.id, connected: false }],
      game: new gamesObjs[gameType].Game(newId, io, args),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    }
    rooms[newRoom.id] = newRoom
    user.room = newRoom.id

    logger.info('Made new room with generated id ' + logger.c.yellow(newId))
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

  let room = structuredClone(user.room)

  logger.info(
    'Exit request from ' +
      logger.c.magenta(user.name + ' (' + logger.c.yellow(user.id) + ')')
  )

  if (game.game.leave(user) == true) {
    logger.info('Delete room ' + logger.c.yellow(user.room))

    game.users.forEach((u) => {
      let U = users[u.id]
      if (U) {
        U.room = null
      }
    })

    delete rooms[room]
  } else {
    game.users.splice(
      game.users.findIndex((u) => u.id == user.id),
      1
    )
  }

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

  if (rooms[user.room] == undefined) {
    logger.warn('Room not found')
    return socket.disconnect()
  }

  if (user.socket && user.socket != null) {
    user.socket.disconnect()
    logger.warn('User already connected. Disconnected old socket')
  }

  let index = rooms[user.room].users.findIndex((u) => u.id == user.id)
  if (index != -1) {
    rooms[user.room].users[index].connected = true
  } else {
    logger.warn('User not found in room')
  }

  users[user.id].socket = socket

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

      rooms[user.room].lastActivity = Date.now()
    }
  })

  socket.on('disconnect', () => {
    if (rooms[user.room] != undefined) {
      let index = rooms[user.room].users.findIndex((u) => u.id == user.id)
      if (index != -1) {
        rooms[user.room].users[index].connected = false
      }

      rooms[user.room].game.socketConnection(user.id, false)
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

  deadGameTimer.start()
})
