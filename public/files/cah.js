const handBar = document.querySelector('#handBar')
const actionBar = document.querySelector('#actionBar')

const startBtn = document.querySelector('#startBtn')
const submitBtn = document.querySelector('#submitBtn')

const infoBoard = document.querySelector('#infoBoard')
const blackCard = document.querySelector('#blackCard')

let roomID = null

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

  console.log('Connected', socket.id)
  emit('join')
  emit('info')
})

////////////////////////////////////////////

let game = null
let user = null

const amReady = () => {
  let nope = false
  nope = user.id == null || nope
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
  console.log('>>', obj)
}

socket.on('game', (data) => {
  console.log('<<', data)

  switch (data.cmd) {
    case 'test':
      console.log('Tested')
      break

    case 'join':
      // userID = data.data.id
      user = data.data
      break

    case 'info':
      game = data.data
      user = data.data.users[user.id]

      renderInfoBoard()
      renderBlack()
      renderHand()
      ready = amReady()
      break
  }
})

const renderInfoBoard = () => {
  let html = ''
  const makeText = (text) => {
    return `<div class="text-white text-2xl my-2">${text}</div>`
  }
  const makeText2 = (t1, t2) => {
    return `<div class="text-white text-2xl my-2"><span class="font-bold">${t1}:</span> ${t2}</div>`
  }

  html += makeText2('Room ID', game.roomid)
  html += makeText2('Players', game.userArray.length)
  html += makeText2('Round', game.round)

  // html += makeText('Room ID: ' + roomID)
  // html += makeText('User ID: ' + user.id)
  // html += makeText('User Name: ' + user.name)
  // html += makeText('User Score: ' + user.score)

  infoBoard.innerHTML = html
}

const renderBlack = () => {
  let html = ''

  if (game.blackCard == null) {
    html += `<span class="flex justify-center items-center h-full"
    >No Card</span
  >`
    actionBar.innerHTML = `Waiting for next round...`
  } else {
    html += `<span class="flex h-full"
    >${game.blackCard.text}</span
  >`
    actionBar.innerHTML = `Pick ${game.blackCard.pick} cards`
  }

  blackCard.innerHTML = html
}

const renderHand = () => {
  const makeSel = (n) => {
    if (user.selHand.includes(n)) {
      let index = user.selHand.indexOf(n) + 1
      return `<div class="absolute inset-0 opacity-50 rounded-xl bg-green-500 ring-2 ring-green-600 pointer-events-none"></div>
    <div class="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-20 w-20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span class="text-3xl">${index}</span>
    </div>`
    }
    return ''
  }
  const makeCard = (title, i) => {
    return `<div
    class="m-4 w-48 shrink-0 rounded-xl bg-white ring-4 ring-black relative select-none pointer-events-auto"
    id="white-card-${i}"
  >
    <div class="text-xl font-semibold px-4 py-2 pointer-events-none">${title}</div>
    ${makeSel(i)}
  </div>`
  }

  let html = ''

  user.hand.forEach((card, i) => {
    html += makeCard(card, i)
  })
  handBar.innerHTML = html
}

// ########################################################

handBar.addEventListener('click', (e) => {
  const clicked = e.target.id
  if (clicked == 'handBar') return
  if (!clicked.includes('white-card')) return
  const card = parseInt(clicked.split('-')[2])
  // console.log(card)

  if (user.selHand.includes(card)) {
    user.selHand.splice(user.selHand.indexOf(card), 1)
  } else {
    user.selHand.push(card)
  }

  renderHand()
  emit('sel', user.selHand)
})

handBar.addEventListener('wheel', (e) => {
  e.preventDefault()
  handBar.scrollLeft += e.deltaY
})
