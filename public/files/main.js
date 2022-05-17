const form = document.querySelector('#form')
const nameBox = document.querySelector('#nameBox')
const roomBox = document.querySelector('#roomBox')
const gameBox = document.querySelector('#gameBox')
// const joinGame = document.querySelector('#joinGame')
// const hostGame = document.querySelector('#hostGame')

const version = document.querySelector('#version')

const getData = async () => {
  const res = await fetch('/userData')
  const data = await res.json()

  version.innerHTML = 'V' + data.version

  data.games.forEach((g) => {
    let opt = document.createElement('option')
    opt.innerText = g
    gameBox.appendChild(opt)
  })

  if (localStorage.getItem('name')) {
    nameBox.value = localStorage.getItem('name')
  } else if (data.user.name) nameBox.value = data.user.name
}

getData()

const NewGame = async () => {
  const body = {
    name: nameBox.value,
    room: roomBox.value,
    game: gameBox.value,
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
  if (nameBox.value.length > 0) {
    localStorage.setItem('name', nameBox.value)
    NewGame()
  }
})

nameBox.addEventListener('keyup', (e) => {
  localStorage.setItem('name', nameBox.value)
})
