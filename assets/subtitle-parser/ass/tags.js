import { alignment, alignDir, generateAnimation } from './utils.js'

const re = {
  delimiter: /({|})/g,
  newline: /\\N/g,
  bold: {
    start: {
      from: /\\b1/g,
      to: '<b>'
    },
    end: {
      from: /\\b0/g,
      to: '</b>'
    }
  },
  italic: {
    start: {
      from: /\\i1/g,
      to: '<i>'
    },
    end: {
      from: /\\i0/g,
      to: '</i>'
    }
  },
  underline: {
    start: {
      from: /\\u1/g,
      to: '<u>'
    },
    end: {
      from: /\\u0/g,
      to: '</u>'
    }
  },
  strike: {
    start: {
      from: /\\s1/g,
      to: '<strike>'
    },
    end: {
      from: /\\s0/g,
      to: '</strike>'
    }
  },
  font: {
    name: /(\\fn.+(?=\\)|\\fn.+(?=}))/g,
    size: /\\fs[0-9]{1,3}/g
  },
  color: /\\\d?c&H[0-9A-Za-z]{2,6}&/,
  alignment: /\\an?\d{1,2}/g,
  fade: /\\fad\(\d*,\d*\)/,
  pos: /\\pos\(\d*,\d*\)/,
  rot: /\\fr(x|y|z)?\d{1,3}/,
  hardSpace: /\\h/g,
  notSupported: [
    /\\(x|y)?bord\d/g, // I don't get this
    /\\(x|y)?shad\d/g,
    /\\be\d/g, /\\blur\d/g,
    /\\fsc(x|y)\d/g, // Can be supported but oh well
    /\\fsp\d/g, // Letter spacing, i'm just lazy
    /\\fa(x|y)\d/g,
    /\\fe\d/,
    /\\(\da|alpha)&H.+&/g, // Alpha
    /\\k(f|o)?\d{1,5}/ig, // Karaoke
    /\\q\d/g,
    /(\\r.+(?=\\)|\\r.+(?=}))/, // Could be handled but rarely used
    /\\move(.+)/g,
    /\\org(.+)/g,
    /\\t(.+)/g,
    /\\i?clip(.+)/g,
    /\\p\d.+\\p\d/g,
    /\\pbo-?\d/g
  ]
}

// Need to clean up {}s after. Also, unsupported tags.
const clean = (string) => {
  re.notSupported.forEach((_re) => {
    string = string.replace(_re, '')
  })

  return string.replace(re.delimiter, '').replace(re.font.size, '')
}

const handleHardSpace = (string) => {
  return string.replace(re.hardSpace, '&nbsp;')
}

const handleCommon = (type, string) => {
  // Handles bold, italic and underline
  const re_ = re[type]

  if (re_.start.from.test(string)) {
    string = string.replace(re_.start.from, re_.start.to)

    re_.end.from.test(string)
      ? string = string.replace(re_.end.from, re_.end.to)
      : string += re_.end.to
  }

  return string.replace(re_.start.from, '').replace(re_.end.from, '')
}

const handleFontSize = (cue, info) => {
  const string = cue.text
  const fontType = re.font.size.test(string) && string.match(re.font.size)[0]

  if (fontType) {
    const { PlayResY: resY } = info
    const size = fontType.slice(3) / resY

    cue.fontSize = size

    cue.text = string.replace(re.font.size, '')
  }

  return cue
}

const setColorStyle = (type, colorTag, string, style) => {
  const color = colorTag.replace(/\\\d?c/g, '').slice(2, 8)
  const r = color.slice(4, 6)
  const g = color.slice(2, 4)
  const b = color.slice(0, 2)
  const hexColor = `#${r}${g}${b}`

  const colorClass = `${type}${color}`

  const typeToProperty = {
    'c': {
      property: 'color',
      rule: hexColor
    },
    'b': {
      property: '-webkit-text-stroke',
      rule: `1.5px ${hexColor},`
    }
  }

  // Check if class is in style. If not, includes it.
  let current = style.innerHTML
  if (!current.includes(`.${colorClass}`)) {
    style.innerHTML += `.video-player p.${colorClass} {${typeToProperty[type].property}:${typeToProperty[type].rule};}`
  }

  return string.replace(re.color, `<p class="${colorClass}" style="display: inline;">`)
}

const handleColor = (string, style) => {
  if (re.color.test(string)) {
    const globalRe = new RegExp(re.color, ['g'])

    for (let i = 0, l = string.match(globalRe).length; i < l; ++i) {
      const colorTag = string.match(re.color)[0]
      const isPrimary = colorTag[1] === 'c' || colorTag[1] === '1'

      if (isPrimary) {
        string = setColorStyle('c', colorTag, string, style)

        if (re.color.test(string)) {
          // Meaning there is another color tag in the string so the closing tag should be
          // before the next color tag
          const match = string.match(re.color)[0]
          const index = string.indexOf(match)
          string = string.slice(0, index) + '</p>' + string.slice(index)
        } else {
          string += '</p>'
        }
      } else {
        // Hopefully temporary
        // Support only for border color
        if (colorTag[1] === '3') {
          string = setColorStyle('b', colorTag, string, style)
        }
      }
    }
  }

  return string
}

const handleFade = (cue, style) => {
  let string = cue.text

  if (re.fade.test(string)) {
    const fadeTag = string.match(re.fade)[0]

    // We can handle only appearing fade animation atm.
    // The time is in ms, we need it in seconds.
    const inDuration = +fadeTag.split(',')[0].replace('\\fad(', '') / 1000

    // There is a need for a css class.
    const fadeInClass = `fade_in_${inDuration}`.replace('.', '')

    cue.style.push(fadeInClass)
    cue.text = string.replace(fadeTag, '')

    // Check if class is in style. If not, includes it.
    let current = style.innerHTML
    if (!current.includes(`.${fadeInClass}`)) {
      const animationName = `fade${inDuration}`.replace('.', '')
      const types = [
        { type: 'in', duration: inDuration, cls: fadeInClass, name: `fade_in_${inDuration}`.replace('.', '') }
      ]

      types.forEach(({type, duration, cls}) => {
        style.innerHTML += `.video-player .${cls} ${generateAnimation(type, animationName, duration)}`
      })
    }
  }

  return cue
}

const handlePos = (cue, info) => {
  const string = cue.text
  const { PlayResX: resX, PlayResY: resY } = info

  if (re.pos.test(string)) {
    const posTag = string.match(re.pos)[0]

    const xy = posTag.replace('\\pos(', '').replace(')', '').split(',')
    const x = Math.round((xy[0] / resX) * 100)
    const y = Math.round((xy[1] / resY) * 100)

    cue.position = x

    if (y >= 50) {
      cue.vert = 'bottom'
      cue.line = 100 - y
    } else {
      cue.vert = 'top'
      cue.line = y
    }

    cue.text = string.replace(posTag, '')
  }

  return cue
}

const handleRotation = (cue) => {
  const string = cue.text

  if (re.rot.test(string)) {
    const rotateTag = string.match(re.rot)
    let axis = rotateTag.replace('\\fr', '').slice(0, 1)

    if (!isNaN(+axis)) {
      // According to the specs, if no axis is specified,
      // the fallback axis should be z.
      axis = 'z'
    }

    const degrees = rotateTag.replace(`\\fr${axis}`, '')

    cue.rotate = ` rotate${axis.toUpperCase}(-${degrees}deg)`

    cue.text = string.replace(rotateTag, '')
  }

  return cue
}

const handleAlignment = (cue, style) => {
  const string = cue.text
  const alignmentTag = re.alignment.test(string) && string.match(re.alignment)[0] // Only the first tag matters

  if (alignmentTag) {
    const isNumpad = alignmentTag[2] === 'n'

    const align = isNumpad
      ? +alignmentTag[3] // tag === '\an<number>, 1 <= number <= 9
      : +alignmentTag.slice(2, 4) // tag === '\a<number>, 1 <= number <= 11

    // Vertical
    cue.vert = align > 6 ? 'top' : 'bottom'
    cue.line = isNumpad ? alignment.numpad[align][0] : alignment.ssa[align][0]

    // Horizontal
    cue.position = isNumpad ? alignment.numpad[align][1] : alignment.ssa[align][1]

    if (isNumpad) {
      cue.horiz = [3, 6, 9].includes(align) ? 'right' : 'left'
      cue.align = [2, 5, 8].includes(align) ? -50 : 0

      cue.textAlign = alignDir.left.includes(align)
        ? 'left'
        : alignDir.right.includes(align)
          ? 'right'
          : 'center'
    } else {
      // Pls use numpad fansubs zzz
      cue.horiz = [3, 7, 11].includes(align) ? 'right' : 'left'
      cue.align = [2, 6, 10].includes(align) ? -50 : 0

      cue.textAlign = [1, 5, 9].includes(align)
        ? 'left'
        : [3, 7, 11].includes(align)
          ? 'right'
          : 'center'
    }

    cue.text = string.replace(re.alignment, '')
  }

  return cue
}

export default function (cue, info) {
  const cssStyle = document.head.children[document.head.childElementCount - 1]

  let string = cue.text

  // Special characters
  string = handleHardSpace(string)
  string = string.replace(/\\n/g, '') // We don't support wrapping style anyway

  if (/\{/g.test(string)) {
    string = handleCommon('bold', string)
    string = handleCommon('italic', string)
    string = handleCommon('underline', string)
    string = handleCommon('strike', string)

    // Most of the time the font name would not be supported,
    // we'll postpone that to another day.
    // string = handleFont('name', string, cssStyle)

    string = handleColor(string, cssStyle)

    cue.text = clean(string)

    cue = handleFontSize(cue, info)
    cue = handlePos(cue, info)
    cue = handleRotation(cue)
    cue = handleAlignment(cue, cssStyle)
    cue = handleFade(cue, cssStyle)
  }

  return cue
}
