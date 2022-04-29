const nameBox = document.querySelector('#nameBox')
const gameBtns = document.querySelector('#games')

const NewGame = async (type) => {
  const body = {
    type: type,
    name: nameBox.value,
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

  window.location.href = `/game/${data.gameId}`
}

const getData = async () => {
  const res = await fetch('/userData')
  const data = await res.json()
  return data
}

const data = await getData()
const games = data.games
console.log(data)

let btns = []

for (const key in games) {
  if (Object.hasOwnProperty.call(games, key)) {
    const game = games[key]

    const btn = document.createElement('button')
    btn.innerText = game.name
    btn.classList.add('gameBtn')
    btn.setAttribute('disabled', '')
    btn.addEventListener('click', () => {
      NewGame(key)
    })
    gameBtns.appendChild(btn)
    btns.push(btn)
  }
}

if (data.user.name) nameBox.value = data.user.name
btns.forEach((b) => {
  if (nameBox.value.length > 0) b.removeAttribute('disabled')
  else b.setAttribute('disabled', '')
})

nameBox.addEventListener('keyup', () => {
  let length = nameBox.value.length
  btns.forEach((b) => {
    if (length > 0) b.removeAttribute('disabled')
    else b.setAttribute('disabled', '')
  })
})
