const crypto = require('crypto')
const cryptoConfig = require('./config/cryptoConfig.json')
const KEY_STRING_ENCODING = cryptoConfig.keyStringEncoding
const KEY = new Buffer.from(cryptoConfig.keyString,KEY_STRING_ENCODING)
const IV = new Buffer.from(cryptoConfig.ivString,KEY_STRING_ENCODING)
const ALGORITHM = cryptoConfig.algorithm
const INPUT_ENCODING = cryptoConfig.inputEncoding
const OUTPUT_ENCODING = cryptoConfig.outputEncoding

// セッション情報が不適切な場合は null を返す
exports.validateSession = function (ciphered) {
  const dateUTC = new Date()
  const todayDate = dateUTC.toLocaleString({ timeZone: 'Asia/Tokyo' }).split(',')[0]

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV)
    let deciphered = decipher.update(Buffer.from(ciphered, OUTPUT_ENCODING),OUTPUT_ENCODING,INPUT_ENCODING)
    deciphered += decipher.final(INPUT_ENCODING)
    
    const decryptoSession = JSON.parse(deciphered)
    const loginDate = decryptoSession.loginDate.split(',')[0]
    const account = decryptoSession.account
    return (todayDate === loginDate) ? account : null
  } catch (error) {
    return null
  }
}

exports.makeSessionString = function (userId, userName) {
  const loginDateUTC = new Date()
  const session = {
    loginDate: loginDateUTC.toLocaleString({ timeZone: 'Asia/Tokyo' }),
    account:{
      userId: userId,
      userName: userName
    }
  }
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV)
  let ciphered = cipher.update(Buffer.from(JSON.stringify(session),INPUT_ENCODING),INPUT_ENCODING,OUTPUT_ENCODING)
  ciphered += cipher.final(OUTPUT_ENCODING)

  console.log(`ログイン日時: ${session.loginDate}`)
  console.log(`セッション文字列: ${ciphered}`)
  return ciphered
}