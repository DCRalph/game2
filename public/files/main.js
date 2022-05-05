const nameBox = document.querySelector('#nameBox')
const roomBox = document.querySelector('#roomBox')
const gameBox = document.querySelector('#gameBox')
const joinGame = document.querySelector('#joinGame')
const hostGame = document.querySelector('#hostGame')

let games = []
games.push('game 1')
games.push('game 2')

games.forEach((g) => {
  let opt = document.createElement('option')
  opt.innerText = g
  console.log(gameBox)
  gameBox.appendChild(opt)
})

const NewGame = async (type) => {
  const body = {
    gameType: type,
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
}

joinGame.addEventListener('click', () => {
  if (nameBox.value.length > 0) {
    NewGame('join')
  }
})

// const getData = async () => {
//   const res = await fetch('/userData')
//   const data = await res.json()
//   return data
// }

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
