import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js'

let res = await fetch('/roomid')
const { roomid: ROOMID } = await res.json()

console.log(ROOMID)

const socket = io({
  auth: {
    roomid: ROOMID,
  },
})

socket.on('connect', () => {
  // socket.join(ROOMID)

  console.log(socket.id)
})
