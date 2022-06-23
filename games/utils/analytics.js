import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const allCards = require('./cah.json')

import fs from 'fs'

const readDB = () => {
  let db = JSON.parse(fs.readFileSync('./db.json', 'utf8'))
  return db
}

const writeDB = (db) => {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2))
}

const track = (id, won) => {
  let db = readDB()

  if (db.used == undefined) {
    db.used = {}
  }

  if (db.used[id] == undefined) {
    db.used[id] = { won: 0, lost: 0 }
  }

  if (won) db.used[id].won++
  else db.used[id].lost++

  writeDB(db)
  console.log(`${id} ${won ? 'won' : 'lost'}`)
}

if (!fs.existsSync('./db.json')) {
  fs.writeFileSync('./db.json', JSON.stringify({}, null, 2))
}

export default { track }
