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

const PORT = 3001

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

  console.log(users)

  res.sendFile(__dirname + '/public/index.html')
})

app.get('/tailwind.css', (req, res) => {
  res.sendFile(__dirname + '/public/tailwind.css')
})

app.get('/userData', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.json({ ok: false })

  res.json({ games, user })
})

app.post('/newgame', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)

  console.log(req.body)

  let gameType = req.body.game
  let room = req.body.room

  users[user.id].name = req.body.name

  if (user.room) {
    if (rooms[user.room]) {
      rooms[user.room].users.splice(rooms[user.room].users.indexOf(user.id), 1)
      io.to(user.room).emit('userLeft', {
        user: user.id,
      })
    }

    user.room = null
  }

  if (!gamesObjs[gameType]) {
    res.json({
      ok: false,
      error: 'Game not found',
    })
    return
  }

  if (room) {
    if (rooms[room]) {
      if (rooms[room].users.length >= rooms[room].game.players.max) {
        res.json({
          ok: false,
          error: 'Room is full',
        })
      } else {
        rooms[room].users.push(user.id)
        user.room = room
        io.to(room).emit('newUser', {
          user: users[user.id],
        })
      }
    } else {
      let newRoom = {
        id: room,
        users: [user.id],
        game: new gamesObjs[gameType].Game(room, io),
      }
      rooms[room] = newRoom
      user.room = room
      io.to(room).emit('newUser', {
        user: users[user.id],
      })
    }
  } else {
    let newId = nanoid(8)
    let newRoom = {
      id: newId,
      users: [user.id],
      game: new gamesObjs[gameType].Game(newId, io),
    }
    rooms[newRoom.id] = newRoom
    user.room = newRoom.id
    io.to(newRoom.id).emit('newUser', {
      user: users[user.id],
    })
  }
  res.json({ ok: true, room: user.room })
})

app.get('/exitGame', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)

  if (!user?.room) return
  let game = rooms[user.room]
  if (!game) return

  if (game.game.leave(user)) delete rooms[user.room]
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

app.get('/game/:id', (req, res) => {
  const roomId = req.params.id

  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.redirect('/')

  users[user.id].room = roomId

  if (rooms[roomId]) {
    let path = __dirname + '/public/' + rooms[roomId].game.file

    if (fs.existsSync(path)) {
      return res.status(200).sendFile(path)
    }
    return res
      .status(404)
      .json({ err: '404 File Not Found', file: req.params.file })
  } else {
    res.redirect('/')
    users[user.id].room = null
  }
})

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

  socket.on('game', (data) => {
    rooms[user.room]?.game.socket(data, user)
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
