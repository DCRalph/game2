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

const validateUser = (tok) => {
  if (users[tok]) {
    return users[tok]
  } else {
    let newUser = {
      id: tok || nanoid(16),
      game: null,
      name: null,
      socket: null,
    }
    users[newUser.id] = newUser
    return newUser
  }
}

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

app.post('/newgame', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)

  console.log(req.body)

  let gameType = req.body.gameType
  let room = req.body.room

  users[user.id].name = req.body.name

  if (user.game) {
    if (rooms[user.game]) {
      rooms[user.game].users.splice(rooms[user.game].users.indexOf(user.id), 1)
      io.to(user.game).emit('userLeft', {
        user: user.id,
      })
    }

    user.game = null
  }

  if (room) {
    if (rooms[room]) {
      rooms[room].users.push(user.id)
      user.game = room
      io.to(room).emit('newUser', {
        user: users[user.id],
      })
    } else {
      let newRoom = {
        id: room,
        users: [user.id],
      }
      rooms[room] = newRoom
      user.game = room
      io.to(room).emit('newUser', {
        user: users[user.id],
      })
    }
  } else {
    let newRoom = {
      id: nanoid(16),
      users: [user.id],
    }
    rooms[newRoom.id] = newRoom
    user.game = newRoom.id
    io.to(newRoom.id).emit('newUser', {
      user: users[user.id],
    })
  }

  res.json({ ok: true, rooms, users })
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
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.redirect('/')

  const gameId = user?.game || req.params.id
  users[user.id].game = gameId

  if (games[gameId]) {
    let path = __dirname + '/public/' + games[gameId].type.file

    if (fs.existsSync(path)) {
      return res.status(200).sendFile(path)
    }
    return res
      .status(404)
      .json({ err: '404 File Not Found', file: req.params.file })
  } else {
    res.redirect('/')
    users[user.id].game = null
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
  let user = validateUser(token)

  users[user.id].socket = socket.id

  socket.join(user.game)

  socket.on('disconnect', () => {
    users[user.id].socket = null
  })
})

let server = httpServer.listen(PORT, () => {
  console.log(server.address())
})
