const form = document.querySelector('#form')
const nameBox = document.querySelector('#nameBox')
const roomBox = document.querySelector('#roomBox')
const gameBox = document.querySelector('#gameBox')
const argsBox = document.querySelector('#argsBox')
const joinGame = document.querySelector('#joinGame')
// const hostGame = document.querySelector('#hostGame')

const version = document.querySelector('#version')
const runningGames = document.querySelector('#runningGames')

const cookieThing = document.querySelector('#cookieThing')
const cookieButton = document.querySelector('#cookieButton')

if (localStorage.getItem('cookie') == null || true) {
  cookieThing.classList.remove('hidden')
}

cookieButton.addEventListener('click', () => {
  localStorage.setItem('cookie', true)
  cookieThing.classList.add('animate-cookie')
  setTimeout(() => {
    cookieThing.classList.add('hidden')
  }, 1000)
})

class Alert {
  constructor(title, msg) {
    this.title = title
    this.msg = msg

    this.alertGroup = document.querySelector('#alertGroup')

    if (this.alertGroup == null) {
      this.alertGroup = document.createElement('div')
      this.alertGroup.id = 'alertGroup'

      this.alertGroup.classList.add(
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'flex-col',
        'items-center',
        'gap-4',
        'mt-4',
        'pointer-events-none'
      )

      document.body.appendChild(this.alertGroup)
    }

    this.duration = 3000

    this.alert = document.createElement('div')
    this.alert.classList.add(
      'bg-white',
      'border',
      'border-gray-300',
      'rounded-lg',

      'p-4',
      'w-96',
      // 'h-32',
      'h-min',
      'transition-all',
      'hover:-translate-y-2',
      'animate-slideIn'
    )

    let div2 = document.createElement('div')
    div2.classList.add('flex', 'flex-col', 'sora')

    let div3 = document.createElement('div')
    div3.classList.add('text-center', 'text-4xl')
    div3.innerHTML = this.title

    let div4 = document.createElement('div')
    div4.classList.add('text-xl')
    div4.innerHTML = this.msg

    div2.appendChild(div3)
    div2.appendChild(div4)

    this.alert.appendChild(div2)

    this.show()
    this.timer = setTimeout(() => {
      this.hide()
    }, this.duration)
  }

  show() {
    this.alertGroup.appendChild(this.alert)
    this.alert.addEventListener(
      'animationend',
      () => {
        this.alert.classList.remove('animate-slideIn')
      },
      { once: true }
    )
  }

  hide() {
    this.alert.classList.add('animate-slideOut')
    this.alert.addEventListener(
      'animationend',
      () => {
        this.alert.remove()
      },
      { once: true }
    )
  }
}

// new alert('Alert', 'This is an alert')

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
  }
  // } else if (data.user.name) nameBox.value = data.user.name

  if (data.inGame != false) {
    let r = data.sendRooms.find((r) => r.id == data.inGame)

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
    sub.innerText = `${r.id} - ${r.users.length} players  - ${r.status}`

    div2.appendChild(title)
    div2.appendChild(sub)

    div.appendChild(div2)

    let btn = document.createElement('button')
    btn.classList.add(
      'flex',
      'sora',
      'font-semibold',
      'text-md',
      'justify-center',
      'rounded-lg',
      'px-4',
      'py-2',
      'bg-purple-600',
      'shadow-lg',
      'shadow-purple-600/50',
      'text-white',
      'hover:bg-purple-700',
      'ring-purple-500',
      'active:ring-2'
    )

    btn.innerText = 'Rejoin'

    btn.addEventListener('click', () => {
      // btn.classList.add('animate-spinFast')
      // setTimeout(() => {
      NewGame(btn, r.id)
      // }, 1000)
    })

    div.appendChild(btn)

    runningGames.appendChild(div)
  }

  data.sendRooms.forEach((r) => {
    if (r.id == data.inGame) return
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
    sub.innerText = `${r.id} - ${r.users.length} players  - ${r.status}`

    div2.appendChild(title)
    div2.appendChild(sub)

    div.appendChild(div2)

    if (
      r.status == 'waiting'
      // || r.users.findIndex((u) => u.id == data.user.id) != -1
    ) {
      let btn = document.createElement('button')
      btn.classList.add(
        'flex',
        'sora',
        'font-semibold',
        'text-md',
        'justify-center',
        'rounded-lg',
        'px-4',
        'py-2',
        'bg-red-600',
        'shadow-lg',
        'shadow-red-600/50',
        'text-white',
        'hover:bg-red-700',
        'ring-red-500',
        'active:ring-2'
      )
      btn.innerText = 'Join'

      btn.addEventListener('click', () => {
        // btn.classList.add('animate-spinFast')
        // setTimeout(() => {
        NewGame(btn, r.id)
        // }, 1000)
      })

      div.appendChild(btn)
    }

    runningGames.appendChild(div)
  })
}

getData()

const NewGame = async (btn, id = null) => {
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
    // alert('Please enter a name')
    new Alert('Error', 'Please enter a name')
    return
  }

  btn.classList.add('animate-spinFast')
  await new Promise((res) => setTimeout(res, 1000))

  const res = await fetch('newGame', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  console.log(data)

  btn.classList.remove('animate-spinFast')

  if (data.ok) {
    window.location.href = `/game/${data.room}`
  } else {
    alert(data.error)
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  // joinGame.classList.add('animate-spinFast')
  // setTimeout(() => {
  NewGame(joinGame)
  // }, 1000)
})

nameBox.addEventListener('keyup', (e) => {
  localStorage.setItem('name', nameBox.value)
})
