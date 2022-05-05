let roomID

const getID = async () => {
  let res = await fetch('/roomid')
  let data = await res.json()
  roomID = data['roomid']
}
getID()

const socket = io()

socket.on('connect', () => {
  setInterval(() => {
    socket.emit('ping')
  }, 1000)

  console.log(socket.id)
})

socket.on('test', () => {
  console.log('test')
})

const test = () => {
  socket.emit('game', {
    cmd: 'test',
  })
}
