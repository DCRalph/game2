import chalk from 'chalk'

const log = console.log

const red = chalk.redBright
const orange = chalk.rgb(255, 100, 0)
const green = chalk.green
const yellow = chalk.yellow
const blue = chalk.blue
const magenta = chalk.magenta
const cyan = chalk.cyan
const white = chalk.white

const bold = chalk.bold

const log1 = (str) => log(`${bold(`${blue('[')}log${blue(']')}`)} ${str}`)

const event = (game, str) =>
  log(blue(bold('[event]')), orange(game.name), cyan(game.roomid), str)
const info = (str) => log(green(bold('[info]')), str)
const warn = (str) => log(yellow(bold('[warn]')), str)
const error = (str) => log(red(bold('[error]')), str)
const debug = (str) => log(magenta(bold('[debug]')), str)

const blank = (ln = 1) => log('\n'.repeat(ln - 1))

// const info = (str) => log(`${green('[info]')} ${str}`)
// const warn = (str) => log(`${yellow('[warn]')} ${str}`)
// const error = (str) => log(`${red('[error]')} ${str}`)
// const debug = (str) => log(`${magenta('[debug]')} ${str}`)

const testALl = () => {
  blank(1)
  log1('log')
  event({ name: 'name', roomid: 'roomid' }, 'event')
  info('info')
  warn('warn')
  error('error')
  debug('debug')

  // log(blue('[') + yellow('logger.js') + blue(']'), 'Ready')
}

testALl()

// info('logger.js')

export default {
  c: {
    red,
    orange,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    bold,
  },
  raw: log,
  log: log1,
  event,
  info,
  warn,
  error,
  debug,
  blank,
}
