const NewGame = async (type) => {
  const res = await fetch('newGame', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'ftg',
    }),
  })

  const data = await res.json()

  console.log(data)

  window.location.href = `/game/${data.gameId}`
}

const getGames = async () => {
  const res = await fetch('/gameTypes')
  const data = await res.json()
  return data
}

const nameBox = document.querySelector('#nameBox')
const gameBtns = document.querySelector('#games')

const games = await getGames()
console.log(games)


for (const key in games) {
  if (Object.hasOwnProperty.call(games, key)) {
    const game = games[key]

    const btn = document.createElement('button')
    btn.innerText = game.name
    btn.classList.add('gameBtn')
    btn.addEventListener('click', () => {
      NewGame(game.id)
    })
    gameBtns.appendChild(btn)
  }
}
