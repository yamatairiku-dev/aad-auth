const msal = require('@azure/msal-node')
const express = require('express'),
    expressEjsLayouts = require('express-ejs-layouts'),
    cookieParser = require('cookie-parser'),
    { getClientIp, mw } = require("request-ip")

const SERVER_PORT = process.env.PORT || 3000
const REDIRECT_URI = 'http://localhost:3000/redirect'
const aad = require('./config/aad.json')
const cryptoSession = require('./cryptoSession')

const config = {
    auth: aad.authOptions,
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
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
const cookieSettings = {
    cookie:{
        maxAge: 3600    //秒
    },
    resave: false,
    saveUninitialized: false
}

app.get('/', (req, res) => {
    res.render('index',{title: 'Top Page'})
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

app.get('/redirect', (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ['user.read'],
        redirectUri: REDIRECT_URI,
    }
    console.log(`\nCode:\n${tokenRequest.code}\n`)

    cca.acquireTokenByCode(tokenRequest).then((response) => {
        console.log("\nResponse: \n:", response)
        const userId = response.account.username
        const userName = response.account.name
        const sessionString = cryptoSession.makeSessionString(userId,userName)
        res.cookie('sessionString', sessionString, cookieSettings)
        res.cookie('userId', userId, cookieSettings)
        res.cookie('userName', userName, cookieSettings)
        res.redirect('/user')
    }).catch((error) => {
        console.log(error)
        res.status(500).send(error)
    })
})

app.get('/user', (req, res) => {
    const data = req.cookies
    const sessionString = data.sessionString
    const account = cryptoSession.validateSession(sessionString)
    if (!account) {
        console.log('セッション情報が不適切')
        res.redirect('/')
        return
    }
    res.render('user', {title: 'User Info', userId: data.userId, userName: data.userName, account})
})

app.listen(SERVER_PORT, () => console.log(`Msal Node Auth Code Sample app listening on port ${SERVER_PORT}!`))
