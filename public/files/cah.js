const handBar = document.querySelector('#handBar')
const handBarCards = document.querySelector('#handBarCards')
const actionBar = document.querySelector('#actionBar')

const leave = document.querySelector('#leave')
const startBtn = document.querySelector('#startBtn')
const endBtn = document.querySelector('#endBtn')
const submitBtn = document.querySelector('#submitBtn')

const infoBoard = document.querySelector('#infoBoard')
const blackCard = document.querySelector('#blackCard')

const newCard = document.querySelector('#newCard')

const model = document.querySelector('#model')
const modelTitle = document.querySelector('#modelTitle')
const pickBox = document.querySelector('#pickBox')
const modelSubmitBtn = document.querySelector('#modelSubmitBtn')
const modelQuestionCard = document.querySelector('#modelQuestionCard')

const wonModel = document.querySelector('#wonModel')
const wonModelText = document.querySelector('#wonModelText')
const wonModelCard = document.querySelector('#wonModelCard')

// window.addEventListener(
//   'beforeunload',
//   function (e) {
//     e.preventDefault()
//     e.returnValue = ''
//     return 'e'
//   },
//   { capture: true }
// )

////////////////////////////////////////////

let game = null
let user = null
let leaving = false
let ping = 0

let modelOrder = []
let showModel = false

const shuffle = (array) => {
  let currentIndex = array.length
  let temporaryValue
  let randomIndex

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}

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
  }, 1000 * 10)

  console.log('Connected', socket.id)
  emit('join')
  emit('info')
})

socket.on('game', (data) => {
  console.log('<<', data)

  switch (data.cmd) {
    case 'test':
      console.log('Tested')
      break

    case 'pong':
      {
        ping = 0
        console.log('Pong', ping)

        if (ping > 5) {
          window.location.href = '/exitGame'
        }
      }
      break

    case 'quit':
      {
        console.log('Quit')
        window.location.href = '/'
      }
      break

    case 'join':
      // userID = data.data.id
      user = data.data
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

      if (game.everyoneSubmited) {
        renderModel(!showModel)
      }

      startBtn.classList.add('hidden')
      endBtn.classList.add('hidden')

      if (game.vip == user.id) {
        if (game.status == 'waiting') {
          startBtn.classList.remove('hidden')
        }

        if (game.status == 'playing') {
          // endBtn.classList.remove('hidden')
        }
      }

      // if(game.userArray[game.turn] != user.id && game.status == 'playing', game.blackCard != null) {
      submitBtn.classList.toggle(
        'hidden',
        !(
          game.userArray[game.turn] != user.id &&
          game.status == 'playing' &&
          game.blackCard != null
        )
      )

      renderInfoBoard()
      renderNewCard()
      renderBlack()
      renderHand()
      if (!user.ready) emit('ready')
      break
    case 'won':
      {
        hideModel()

        let wonUser = game.users[data.data.user]

        renderWonModel(wonUser.name, wonUser.won[wonUser.won.length - 1])

        setTimeout(() => {
          hideWonModel()
        }, 5000)

        // renderWonModel('meeee', [{ text: 'black' }, ['red', 'blue', 'green']])
      }
      break
  }
})

const hideModel = () => {
  model.classList.add('hidden')
  modelSubmitBtn.classList.add('hidden')
  modelQuestionCard.innerHTML = ''
  pickBox.innerHTML = ''
  showModel = false
}

const renderModel = (shuffelModel = false) => {
  model.classList.remove('hidden')
  if (game.users[game.userArray[game.turn]].id == user.id) {
    modelSubmitBtn.classList.remove('hidden')

    modelTitle.innerHTML = 'Pick the best answer.'
  } else {
    modelTitle.innerHTML = `${
      game.users[game.userArray[game.turn]].name
    } is picking.`
  }
  showModel = true

  const makeSel = (i) => {
    if (game.selModel == i) {
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
    </div>`
    }
    return ''
  }

  const makeInner = (answers) => {
    let inner = ''
    answers.forEach((text, i) => {
      let border = i != 0 ? 'border-t-2 border-gray-300' : ''
      inner += `
    <div
      class="text-xl font-semibold px-4 py-2 pointer-events-none ${border}"
    >
      ${text}
    </div>`
    })
    return inner
  }

  const makeCard = (id, answers) => {
    return `<div
    class="relative w-48 h-72 overflow-y-scroll bg-white ring-4 ring-black rounded-xl select-none"
    id="model-${id}"
  >
    ${makeInner(answers)}
    ${makeSel(id)}
  </div>`
  }

  let cards = []

  game.userArray.forEach((id, i) => {
    let thisUser = game.users[id]
    if (thisUser.id == game.users[game.userArray[game.turn]].id) return
    let answers = []

    thisUser.selHand.forEach((id2) => {
      answers.push(thisUser.hand[id2])
    })

    cards.push(makeCard(i, answers))
  })

  // for (let i = 0; i < 5; i++) {
  //   cards.push(makeCard(i, ['cum', 'cum2']))
  // }

  if (shuffelModel) {
    modelOrder = shuffle([...Array(cards.length).keys()])
  }

  let html = ''
  cards.forEach((c, i) => {
    html += cards[modelOrder[i]]
  })

  modelQuestionCard.innerHTML = game.blackCard.text

  pickBox.innerHTML = html
}

const hideWonModel = () => {
  wonModel.classList.add('hidden')
}

const renderWonModel = (name, cards) => {
  const makeInner = (answers) => {
    let inner = ''
    answers.forEach((text, i) => {
      let border = i != 0 ? 'border-t-2 border-gray-300' : ''
      inner += `
    <div
      class="text-xl font-semibold px-4 py-2 ${border}"
    >
      ${text}
    </div>`
    })
    return inner
  }

  const makeCard = (cards) => {
    return `<div
    class="w-48 h-72 shrink-0 rounded-xl bg-black ring-4 ring-white relative select-none"
  >
    <div
      class="text-xl text-white font-semibold px-4 py-2"
    >${cards[0].text}</div>
  </div>

    <div
    class="relative w-48 h-72 overflow-y-scroll bg-white ring-4 ring-black rounded-xl select-none"
  >
    ${makeInner(cards[1])}
  </div>`
  }

  let html = ''

  html += makeCard(cards)

  wonModelCard.innerHTML = html
  wonModelText.innerHTML = name

  wonModel.classList.remove('hidden')
}

const renderInfoBoard = () => {
  let extraInfo = [
    ['Room ID', game.roomid],
    ['Round', game.round],
    ['White Cards', game.whiteLen],
    ['Black Cards', game.blackLen],
  ]

  //   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  //   <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  // </svg>

  let path

  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 576 512')
  svg.setAttribute('class', 'h-6 w-6 text-yellow-500')
  path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M576 136c0 22.09-17.91 40-40 40-.248 0-.4551-.1266-.7031-.1305l-50.52 277.9C482 468.9 468.8 480 453.3 480H122.7c-15.46 0-28.72-11.06-31.48-26.27L40.71 175.9C40.46 175.9 40.25 176 39.1 176c-22.09 0-40-17.91-40-40S17.91 96 39.1 96s40 17.91 40 40c0 8.998-3.521 16.89-8.537 23.57l89.63 71.7c15.91 12.73 39.5 7.544 48.61-10.68l57.6-115.2C255.1 98.34 247.1 86.34 247.1 72C247.1 49.91 265.9 32 288 32s39.1 17.91 39.1 40c0 14.34-7.963 26.34-19.3 33.4l57.6 115.2c9.111 18.22 32.71 23.4 48.61 10.68l89.63-71.7C499.5 152.9 496 144.1 496 136C496 113.9 513.9 96 536 96S576 113.9 576 136z'
  )
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)

  let svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg2.setAttribute('viewBox', '0 0 24 24')
  svg2.setAttribute('class', 'h-6 w-6 text-yellow-500')
  svg2.setAttribute('fill', 'none')
  svg2.setAttribute('stroke', 'currentColor')
  svg2.setAttribute('stroke-width', '2')
  path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
  )
  path.setAttribute('fill', 'currentColor')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  svg2.appendChild(path)

  let table1, table2, tbody, tr, th, td, span

  table1 = document.createElement('table')
  table1.classList.add('table-auto', 'rounded-lg', 'bg-white', 'w-64')

  thead = document.createElement('thead')
  tr = document.createElement('tr')
  th = document.createElement('th')

  th.classList.add('py-2')
  th.innerHTML = 'Name'
  tr.appendChild(th)

  th = document.createElement('th')

  th.classList.add('py-2', 'border-l-2')
  th.innerHTML = 'Score'
  tr.appendChild(th)

  thead.appendChild(tr)
  table1.appendChild(thead)
  tbody = document.createElement('tbody')

  let users = Object.values(game.users)
  users.sort((a, b) => {
    return b.score - a.score
  })

  users.forEach((User) => {
    tr = document.createElement('tr')
    tr.classList.add('border-t-2')
    td = document.createElement('td')
    td.classList.add('px-4', 'py-2', 'flex', 'items-center', 'gap-2')
    if (User.vip) {
      td.appendChild(svg.cloneNode(true))
    } else if (User.id == user.id) {
      td.appendChild(svg2.cloneNode(true))
    }

    span = document.createElement('span')
    if (game.userArray[game.turn] == User.id) span.classList.add('text-red-500')
    else if (User.submited) span.classList.add('text-green-500')

    span.innerText = User.name
    td.appendChild(span)
    tr.appendChild(td)

    th = document.createElement('td')
    th.classList.add('px-4', 'py-2', 'border-l-2', 'text-center')
    th.innerHTML = User.score
    tr.appendChild(th)
    tbody.appendChild(tr)
  })

  table1.appendChild(tbody)

  table2 = document.createElement('table')
  table2.classList.add('table-auto', 'rounded-lg', 'bg-white', 'w-64')

  thead = document.createElement('thead')
  tr = document.createElement('tr')
  th = document.createElement('th')

  th.classList.add('w-1/2')
  tr.appendChild(th)
  thead.appendChild(tr)
  table2.appendChild(thead)

  tbody = document.createElement('tbody')

  extraInfo.forEach((info, index) => {
    tr = document.createElement('tr')

    if (index > 0) tr.classList.add('border-t-2')
    td = document.createElement('td')
    td.classList.add('px-4', 'py-2', 'flex', 'items-center', 'gap-2')
    span = document.createElement('span')
    span.innerHTML = info[0]
    td.appendChild(span)
    tr.appendChild(td)

    td = document.createElement('td')
    td.classList.add('px-4', 'py-2', 'border-l-2', 'text-center')
    td.innerHTML = info[1]
    tr.appendChild(td)
    tbody.appendChild(tr)
  })

  table2.appendChild(tbody)

  infoBoard.innerHTML = ''
  infoBoard.appendChild(table1)
  infoBoard.appendChild(table2)

  // infoBoard.innerHTML = html
}

const renderNewCard = () => {
  const hide = () => {
    newCard.classList.add('hidden')
  }
  const show = () => {
    newCard.classList.remove('hidden')
  }

  if (game.status != 'playing') {
    hide()
    return
  }

  if (game.userArray[game.turn] == user.id && game.blackCard == null) show()
  else hide()
}

const renderBlack = () => {
  let html = ''

  if (game.blackCard == null) {
    html += `<span class="flex justify-center items-center h-full"
    >No Card</span
  >`
    if (game.status == 'waiting') actionBar.innerHTML = `Waiting...`
    else actionBar.innerHTML = `Waiting for next round...`
  } else {
    html += `<span class="flex h-full"
    >${game.blackCard.text}</span
  >`
    if (game.userArray[game.turn] == user.id)
      actionBar.innerHTML = `Wait for players to pick...`
    else
      actionBar.innerHTML = `Pick ${game.blackCard.pick} card${
        game.blackCard.pick > 1 ? 's' : ''
      }`
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
    class="w-48 h-72 shrink-0 rounded-xl bg-white ring-4 ring-black relative select-none pointer-events-auto"
    id="white-card-${i}"
  >
    <div class="text-xl font-semibold px-4 py-2 pointer-events-none">${title}</div>
    ${makeSel(i)}
  </div>`
  }

  let html = ''

  if (user.submited) {
    html += `<div
    class="absolute z-20 inset-0 bg-opacity-50 bg-gray-500 pointer-events-none"
  >
    <div
      class="absolute z-30 text-white text-4xl inset-0 flex flex-col justify-center items-center pointer-events-none"
    >
      Submited
    </div>
  </div>`
  }

  user.hand.forEach((card, i) => {
    html += makeCard(card, i)
  })
  handBarCards.innerHTML = html
}

// ########################################################

handBar.addEventListener('click', (e) => {
  const clicked = e.target.id
  if (clicked == 'handBar') return
  if (!clicked.includes('white-card')) return
  if (game.blackCard == null) return
  if (user.submited) return
  if (game.userArray[game.turn] == user.id) return
  const card = parseInt(clicked.split('-')[2])
  // console.log(card)

  if (user.selHand.includes(card)) {
    user.selHand.splice(user.selHand.indexOf(card), 1)
  } else {
    if (game.blackCard.pick == 1) {
      user.selHand = [card]
    } else {
      if (user.selHand.length == game.blackCard?.pick) return
      user.selHand.push(card)
    }
  }

  renderHand()
  emit('sel', user.selHand)
})

pickBox.addEventListener('click', (e) => {
  const clicked = e.target.id
  if (clicked == 'pickBox') return
  if (!game.everyoneSubmited) return
  if (game.users[game.userArray[game.turn]].id != user.id) return
  const card = parseInt(clicked.split('-')[1])
  game.selModel = card
  renderModel()
  // console.log(clicked, card)
  emit('selModel', card)
})

modelSubmitBtn.addEventListener('click', () => {
  if (game.selModel == null) return
  emit('choose', game.selModel)
  modelSubmitBtn.classList.add('hidden')
  // hideModel()
})

window.onbeforeunload = function (e) {
  e = e || window.event

  if (!leaving) {
    if (e) {
      e.returnValue = 'Any string'
    }

    return 'Any string'
  }
}

leave.addEventListener('click', () => {
  leaving = true
  window.location.href = '/exitGame'
})

startBtn.addEventListener('click', () => {
  emit('start')
})

endBtn.addEventListener('click', () => {
  emit('end')
})

submitBtn.addEventListener('click', () => {
  // if (user.selHand.length == 0) return
  if (game.userArray[game.turn] == user.id) return
  if (user.selHand.length != game.blackCard.pick) return
  emit('submit')
})

newCard.addEventListener('click', () => {
  emit('newCard')
})

handBar.addEventListener('wheel', (e) => {
  // e.preventDefault()
  // handBar.scrollLeft += e.deltaY
  if (user.submited) {
    handBar.children[0].style.left = handBar.scrollLeft + 'px'
    handBar.children[0].style.right = -handBar.scrollLeft + 'px'
  }
})

const logScores = () => {
  game.userArray.forEach((id) => {
    console.log(game.users[id].name, game.users[id].score)
  })
}
