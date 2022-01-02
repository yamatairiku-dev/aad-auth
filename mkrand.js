const crypto = require('crypto')

// 32バイト（256ビット）の擬似乱数を生成
const key = crypto.randomBytes(32)  //バイナリ
console.log('key:')
console.log(key.toString('hex'))    //16進数

// 32バイト（256ビット）の擬似乱数を生成
const iv = crypto.randomBytes(16)
console.log('iv:')
console.log(iv.toString('hex'))