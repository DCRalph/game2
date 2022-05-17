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

  if (data.user.name) nameBox.value = data.user.name
}

getData()

const NewGame = async () => {
  const body = {
    name: nameBox.value,
    room: roomBox.value,
    game: gameBox.value,
  }

  console.log(body)

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
    NewGame()
  }
})

// const data = await getData()
// const games = data.games
// console.log(data)

// let btns = []

// for (const key in games) {
//   if (Object.hasOwnProperty.call(games, key)) {
//     const game = games[key]

//     const btn = document.createElement('button')
//     btn.innerText = game.name
//     btn.classList.add('gameBtn')
//     btn.setAttribute('disabled', '')
//     btn.addEventListener('click', () => {
//       NewGame(key)
//     })
//     gameBtns.appendChild(btn)
//     btns.push(btn)
//   }
// }

// if (data.user.name) nameBox.value = data.user.name
// btns.forEach((b) => {
//   if (nameBox.value.length > 0) b.removeAttribute('disabled')
//   else b.setAttribute('disabled', '')
// })

// nameBox.addEventListener('keyup', () => {
//   let length = nameBox.value.length
//   btns.forEach((b) => {
//     if (length > 0) b.removeAttribute('disabled')
//     else b.setAttribute('disabled', '')
//   })
// })
