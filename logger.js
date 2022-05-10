import chalk from 'chalk'

const log = console.log

const red = chalk.red
const green = chalk.green
const yellow = chalk.yellow
const blue = chalk.blue
const magenta = chalk.magenta
const cyan = chalk.cyan
const white = chalk.white



export default {
  c: {
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
  },
  log: log,
  error: (...args) => log(red(...args)),
  warning: (...args) => log(yellow(...args)),
  info: (...args) => log(blue(...args)),
  success: (...args) => log(green(...args)),
  debug: (...args) => log(magenta(...args)),
}