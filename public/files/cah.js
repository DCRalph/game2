const handBar = document.querySelector('#handBar')
const submitBtn = document.querySelector('#submitBtn')

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
let selHand = []

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
      
      renderHand()
      ready = amReady()
      break
  }
})

const renderHand = () => {
  const makeSel = (n) => {
    if (selHand.includes(n)) {
      let index = selHand.indexOf(n) + 1
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
    <div class="text-2xl font-semibold px-4 py-2 pointer-events-none">${title}</div>
    ${makeSel(i)}
  </div>`
  }

  let html = ''

  hand.forEach((card, i) => {
    html += makeCard(card, i)
  })
  handBar.innerHTML = html
}

// ########################################################

emit('join')

handBar.addEventListener('click', (e) => {
  const clicked = e.target.id
  if (clicked == 'handBar') return
  if (!clicked.includes('white-card')) return
  const card = parseInt(clicked.split('-')[2])
  console.log(card)

  if (selHand.includes(card)) {
    selHand.splice(selHand.indexOf(card), 1)
  } else {
    selHand.push(card)
  }

  renderHand()
})
