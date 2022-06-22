const test1 = () => {
  let hand = ['1', '2', '3', '4', '5']
  let selHand = [4, 1, 3]

  selHand.forEach((i) => {
    console.log(hand[i])
  })

  console.log(hand)
}

const test2 = () => {
  let users = [{ id: '123', connected: false }]

  console.log(users.findIndex((u) => u.id == '123'))
}

// test1()
test2()
