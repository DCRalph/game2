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
let games = {}

// class FTG {
//   constructor(roomid) {
//     this.roomid = roomid

//     this.min = 3
//     this.max = 6

//     this.players = []
//     this.turn = 0

//     this.file = 'ftg.html'
//   }
// }

// const gameTypes = [FTG]

const gameTypes = {
  ftg: {
    name: 'For the Girls',
    shortName: 'ftg',
    file: 'ftg.html',
    players: {
      min: 2,
      max: 8,
    },
  },
}

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

const getUser = (tok) => {
  return users[tok]
}

app.get('/', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)
  res.cookie('token', user.id, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
  })

  // console.log(users)

  res.sendFile(__dirname + '/public/index.html')
})

app.get('/gameTypes', (req, res) => {
  res.json(gameTypes)
})

app.post('/newgame', (req, res) => {
  let token = req.cookies.token
  let user = validateUser(token)

  if (!user.game) {
    let type = req.body.type

    let game = {
      id: nanoid(4),
      type: gameTypes[type],
      players: [user.id],
      state: 'waiting',
      turn: 0,
    }
    games[game.id] = game
    user.game = game.id

    res.json({
      gameId: game.id,
      test: games,
    })

    // console.log(games)
  } else {
    res.json({
      error: 'already in game',
      gameId: user.game,
    })
  }
})

app.get('/tailwind.css', (req, res) => {
  res.sendFile(__dirname + '/public/tailwind.css')
})

app.get('/roomid', (req, res) => {
  let token = req.cookies.token
  let roomid = getUser(token)?.game || null
  res.json({ roomid })
})

app.get('/admin', (req, res) => {
  let obj = {
    users,
    games,
    gameTypes,
  }

  res.json(obj)
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

app.get('/game/', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.redirect('/')

  if (user?.game) {
    res.redirect(`/game/${user.game}`)
  } else {
    res.redirect('/')
  }
})

app.get('/game/:id', (req, res) => {
  let token = req.cookies.token
  let user = getUser(token)
  if (typeof user == 'undefined') return res.redirect('/')

  const gameId = user?.game || req.params.id
  users[user.id].game = gameId

  if (games[gameId]) {
    res.sendFile(__dirname + `/public/${games[gameId].type.file}`)
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

  // console.log(user)

  console.log('a user connected')
  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

let server = httpServer.listen(PORT, () => {
  console.log(server.address())
})
