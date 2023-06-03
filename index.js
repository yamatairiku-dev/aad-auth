const msal = require('@azure/msal-node')
const express = require('express')
const expressSession = require('express-session')
const expressEjsLayouts = require('express-ejs-layouts')
const cookieParser = require('cookie-parser')
const { getClientIp, mw } = require('request-ip')

const SERVER_PORT = process.env.PORT || 3000
const REDIRECT_URI = 'http://localhost:3000/auth/redirect'
const aad = require('./config/aad.json')

const config = {
  auth: aad.authOptions,
  system: {
    loggerOptions: {
      loggerCallback (loglevel, message, containsPii) {
        console.log(message)
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose
    }
  }
}

// Create msal application object
const cca = new msal.ConfidentialClientApplication(config)

const app = express()
app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(expressEjsLayouts)
app.use(express.static('public'))
app.use(mw())
app.use(
  expressSession({
    secret: 'secret_code',
    name: 'session', // default: connect.sid
    resave: false,
    saveUninitialized: true,
    cookie: {
      path: '/', // default
      httpOnly: true, // default
      maxAge: 60 * 60 * 1000 // 1hour
    }
  })
)

app.get('/', (req, res) => {
  if (!req.session.count) {
    req.session.count = 1
  }
  res.render('index', { title: 'Top Page' })
  console.log(req.headers)
  console.log(`IPアドレス: ${getClientIp(req)}`)
})

app.get('/auth', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI
  }

  // get url to sign user in and consent to scopes needed for application
  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    console.log(`\nResponse:\n${response}\n`)
    res.redirect(response)
  }).catch((error) => console.log(JSON.stringify(error)))
})

app.get('/auth/redirect', (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI
  }
  console.log(`\nCode:\n${tokenRequest.code}\n`)

  cca.acquireTokenByCode(tokenRequest).then((response) => {
    console.log('\nToken')
    console.dir(response, { depth: null })
    console.log('\n現在時刻')
    const now = new Date()
    console.log(now)
    const userId = response.account.username
    const userName = response.account.name
    const idToken = response.idToken
    req.session.userId = userId
    req.session.userName = userName
    req.session.idToken = idToken
    res.redirect('/user')
  }).catch((error) => {
    console.log(error)
    res.status(500).send(error)
  })
})

app.get('/user', (req, res) => {
  const userId = req.session.userId
  const userName = req.session.userName
  const idToken = req.session.idToken
  const count = req.session.count++
  res.render('user', { title: 'User Info', userId, userName, idToken, count })
})

app.listen(SERVER_PORT, () => console.log(`Msal Node Auth Code Sample app listening on port ${SERVER_PORT}!`))
