let roomID

const getID = async () => {
  let res = await fetch('/roomid')
  let data = await res.json()
  roomID = data['roomid']
}
getID()

const socket = io()

socket.on('connect', () => {
  // setInterval(() => {
  //   socket.emit('ping')
  // }, 1000)

  console.log(socket.id)
})

socket.on('game', (data) => {
  console.log(data)

  switch (data.cmd) {
    case 'test':
      console.log('tested')
      break
  }
})

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
  console.log(obj)
}
