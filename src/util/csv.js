import readline from 'readline'
import {streamIt} from "./streams"

export const parseZoneGeoCsv = async buffer => await new Promise(function (resolve) {
    const rl = readline.createInterface({input: streamIt(buffer)})

    const zones = []
    let head = true

    rl.on('line', (rawLine) => {
        if (!head) {
            const line = tagLine(rawLine)
            zones.push({code: line.next(), label: line.next()})
        } else {
            head = false
        }
    })

    rl.on('close', () => {
        resolve(zones)
    })
})

export const parseImpactCsv = async buffer => await new Promise(function (resolve) {
    const rl = readline.createInterface({input: streamIt(buffer)})

    const impacts = []
    let head = true
    let ignoreCount = 1
    let line = null

    rl.on('line', lineProduits => {
        if (head) {
            head = false
            line = tagLine(lineProduits)
            line.skip(4)
        } else if (ignoreCount === 0) {
            const tl = tagLine(lineProduits)
            let qt
            let impactId = tl.next()
            tl.skip(3)
            line.reset()
            line.skip(4)
            while (qt = tl.next()) {
                impacts.push({trunkExternId: line.next(), impactExternId: impactId, bqt: parseFloat(qt)})
            }
        } else {
            ignoreCount--
        }
    })

    rl.on('close', () => {
        resolve(impacts)
    })

})

export const parseImpactEntryCsv = async buffer => await new Promise(function (resolve) {
    const rl = readline.createInterface({input: streamIt(buffer)})

    const impacts = []
    let head = true
    let ignoreCount = 1

    rl.on('line', (line) => {
        if (head) {
            head = false
        } else if (ignoreCount === 0) {
            const cursor = tagLine(line)
            let externId = cursor.next()
            cursor.skip()
            let nom = noQuotes(cursor.next())
            let unit = noQuotes(cursor.next())
            impacts.push({nom, externId, unit})
        } else {
            ignoreCount--
        }
    })

    rl.on('close', () => {
        resolve(impacts)
    })

})

export const pairTagInside = (line, start, end) => {
    let count = 0
    let i = start

    if (start === end) return undefined

    while (i < end) {
        i = line.indexOf("\"", i)
        if (i === -1) {
            break
        }
        if (i < end) {
            count++
            i++
        }
    }

    return count % 2 === 0
}
export const tagLine = line => {
    let i = 0
    let sep = ";"
    let end

    let column = -1

    return {
        col: () => column,
        reset: () => {
            i = 0
            column = -1
        },
        skip: function (n) {
            n = n || 1
            for (let j = 0; j < n; j++) {
                i = indexOfWithPairTag(line, sep, i)
                if (i === -1) break
                i++
            }
            column += n
        },
        next: () => {
            if (i === -1 || i > line.length) {
                column = -1
                return null
            }
            end = indexOfWithPairTag(line, sep, i)
            if (end === -1) {
                end = line.length
            }
            const res = line.substring(i, end)
            i = end + 1
            column++
            return res
        }
    }
}
export const indexOfWithPairTag = (line, sep, start) => {
    let i = start
    let lookAt = i
    while (true) {
        lookAt = line.indexOf(sep, lookAt)
        if (lookAt === -1 || pairTagInside(line, i, lookAt)) {
            break
        } else {
            lookAt++
        }
    }
    return lookAt
}
const noQuotes = str => str.substr(1, str.length - 2).trim()