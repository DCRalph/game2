const handBar = document.querySelector('#handBar')
const handBarCards = document.querySelector('#handBarCards')
const actionBar = document.querySelector('#actionBar')

const startBtn = document.querySelector('#startBtn')
const submitBtn = document.querySelector('#submitBtn')

const infoBoard = document.querySelector('#infoBoard')
const blackCard = document.querySelector('#blackCard')

const urTurn = document.querySelector('#urTurn')
const newCard = document.querySelector('#newCard')

const model = document.querySelector('#model')
const pickBox = document.querySelector('#pickBox')
const modelSubmitBtn = document.querySelector('#modelSubmitBtn')
const modelQuestionCard = document.querySelector('#modelQuestionCard')

const wonModel = document.querySelector('#wonModel')
const wonModelText = document.querySelector('#wonModelText')
const wonModelCard = document.querySelector('#wonModelCard')

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

const amReady = () => {
  let nope = false
  nope = user.id == null || nope

  if (!nope) emit('ready')
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

    case 'info':
      game = data.data
      user = data.data.users[user.id]

      if (game.everyoneSubmited) {
        renderModel(!showModel)
      }

      if (game.status == 'playing') {
        startBtn.classList.add('hidden')
      }

      if(game.vip == user.id){
        startBtn.classList.remove('hidden')
      }


      renderInfoBoard()
      renderUrTurn()
      renderBlack()
      renderHand()
      if (!user.ready) amReady()
      break
    case 'won':
      {
        hideModel()

        renderWonModel(
          data.data.user.name,
          data.data.user.won[data.data.user.won.length - 1]
        )

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
  if(game.users[game.userArray[game.turn]].id == user.id){
    modelSubmitBtn.classList.remove('hidden')
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
    class="relative w-48 h-72 overflow-y-scroll bg-white ring-4 ring-black rounded-xl"
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
      class="text-xl font-semibold px-4 py-2 pointer-events-none ${border}"
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
      class="text-xl text-white font-semibold px-4 py-2 pointer-events-none"
    >${cards[0].text}</div>
  </div>

    <div
    class="relative w-48 h-72 overflow-y-scroll bg-white ring-4 ring-black rounded-xl"
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
  let html = ''
  const makeText = (text) => {
    return `<div class="text-white text-2xl my-2">${text}</div>`
  }
  const makeText2 = (t1, t2) => {
    return `<div class="text-white text-2xl my-2"><span class="font-bold">${t1}:</span> ${t2}</div>`
  }

  html += makeText2('Room ID', game.roomid)
  html += makeText2('Status', game.status)
  html += makeText2('Players', game.userArray.length)
  html += makeText2('Turn', game.users[game.userArray[game.turn]].name)
  html += makeText2('Round', game.round)
  html += makeText2('Score', user.score)

  // html += makeText('Room ID: ' + roomID)
  // html += makeText('User ID: ' + user.id)
  // html += makeText('User Name: ' + user.name)
  // html += makeText('User Score: ' + user.score)

  infoBoard.innerHTML = html
}

const renderUrTurn = () => {
  const hide = () => {
    urTurn.classList.add('hidden')
  }
  const show = () => {
    urTurn.classList.remove('hidden')
  }

  if (game.status != 'playing') {
    hide()
    return
  }

  if (game.userArray[game.turn] == user.id) show()
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
    else actionBar.innerHTML = `Pick ${game.blackCard.pick} cards`
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
  emit('choose', game.selModel)
  modelSubmitBtn.classList.add('hidden')
  // hideModel()
})

startBtn.addEventListener('click', () => {
  emit('start')
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
  game.userArray.forEach((id) =>{
    console.log(game.users[id].name, game.users[id].score)
  })
}
