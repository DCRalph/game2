const form = document.querySelector('#form')
const nameBox = document.querySelector('#nameBox')
const roomBox = document.querySelector('#roomBox')
const gameBox = document.querySelector('#gameBox')
const argsBox = document.querySelector('#argsBox')
// const joinGame = document.querySelector('#joinGame')
// const hostGame = document.querySelector('#hostGame')

const version = document.querySelector('#version')
const runningGames = document.querySelector('#runningGames')

const cookieThing = document.querySelector('#cookieThing')
const cookieButton = document.querySelector('#cookieButton')

if (localStorage.getItem('cookie') == null) {
  cookieThing.classList.remove('hidden')
}

cookieButton.addEventListener('click', () => {
  localStorage.setItem('cookie', true)
  cookieThing.classList.add('hidden')
})

const getData = async () => {
  const res = await fetch('/userData')
  const data = await res.json()

  console.log(data)

  version.innerHTML = 'V' + data.version

  data.games.forEach((g) => {
    let opt = document.createElement('option')
    opt.innerText = g
    gameBox.appendChild(opt)
  })

  if (localStorage.getItem('name')) {
    nameBox.value = localStorage.getItem('name')
  } else if (data.user.name) nameBox.value = data.user.name

  data.sendRooms.forEach((r) => {
    let div = document.createElement('div')
    div.classList.add(
      'bg-white',
      'rounded-lg',
      'flex',
      'py-2',
      'px-4',
      'justify-between',
      'items-center'
    )

    let div2 = document.createElement('div')
    div2.classList.add('flex', 'flex-col')

    let title = document.createElement('span')
    title.classList.add('text-lg')
    title.innerText = r.name

    let sub = document.createElement('span')
    sub.classList.add('text-xs')
    sub.innerText = `${r.id} - ${r.users} players`

    div2.appendChild(title)
    div2.appendChild(sub)

    let btn = document.createElement('button')
    btn.classList.add(
      'flex',
      'px-2',
      'bg-red-500',
      'hover:bg-red-600',
      'rounded',
      'h-8',
      'justify-center',
      'items-center',
      'text-white'
    )
    btn.innerText = 'Join'

    div.appendChild(div2)
    div.appendChild(btn)

    btn.addEventListener('click', () => {
      NewGame(r.id)
    })

    runningGames.appendChild(div)
  })
}

getData()

const NewGame = async (id = null) => {
  let body
  if (id == null) {
    body = {
      name: nameBox.value,
      room: roomBox.value,
      game: gameBox.value,
      args: argsBox.value,
    }
  } else {
    body = {
      name: nameBox.value,
      room: id,
      game: null,
    }
  }

  if (nameBox.value.length > 0) {
    localStorage.setItem('name', nameBox.value)
  } else {
    return
  }

  const res = await fetch('newGame', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  console.log(data)

  if (data.ok) {
    window.location.href = `/game/${data.room}`
  } else {
    alert(data.error)
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  NewGame()
})

nameBox.addEventListener('keyup', (e) => {
  localStorage.setItem('name', nameBox.value)
})
