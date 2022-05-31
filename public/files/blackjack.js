let game = null
let user = null
let ping = 0

const socket = io()

const emit = (cmd, data = {}) => {
  let obj = {
    cmd,
    data,
  }
  if (typeof obj.cmd == 'undefined') {
    console.log('emit: no cmd')
    return
  }

  socket.emit('game', obj)
  console.log('>>', obj)
}

socket.on('connect', () => {
  setInterval(() => {
    emit('ping')
    ping += 1
    if (ping > 3) {
      leaving = true
      window.location.href = '/exitGame'
    }
  }, 1000 * 5)

  console.log('Connected', socket.id)
  emit('join')
  emit('info')
})

socket.on('game', (data) => {
  console.log('<<', data)

  switch (data.cmd) {
    case 'test':
      {
        console.log('Tested')
      }
      break

    case 'pong':
      {
        ping = 0
      }
      break

    case 'quit':
      {
        console.log('Quit')
        window.location.href = '/'
      }
      break

    case 'join':
      {
        user = data.data
      }
      break

    case 'start':
      {
        console.log('Start')
        if (data.data != 'ok') {
          alert(data.data)
        }
      }
      break

    case 'info':
      game = data.data
      user = data.data.users[user.id]

      if (!user.ready) emit('ready')
      break
  }
})
