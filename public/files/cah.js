const handBar = document.querySelector('#handBar')

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

////////////////////////////////////////////

let ready = false
let hand = []

const amReady = () => {
  let nope = false
  nope = hand.length != 5 || nope
  return !nope
}

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

socket.on('game', (data) => {
  console.log(data)

  switch (data.cmd) {
    case 'test':
      console.log('tested')
      break
    case 'join':
      hand = data.data.hand
      showHand()
      ready = amReady()
      break
  }
})

const showHand = () => {
  const makeCard = (title) => {
    return `<div class="m-4 w-48 shrink-0  rounded-xl bg-white ring-4 ring-black">
    <div class="text-2xl font-semibold px-4 py-2">${title}</div>
  </div>`
  }

  let html = ''

  hand.forEach((card) => {
    html += makeCard(card)
  })
  handBar.innerHTML = html
}

// ########################################################

emit('join')
