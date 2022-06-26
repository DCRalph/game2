const getData = async () => {
  const res = await fetch('/admindata')
  const data = await res.json()

  console.log(data)
}

getData()

// setInterval(getData, 1000)
//
