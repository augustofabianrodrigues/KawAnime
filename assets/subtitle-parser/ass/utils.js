import _ from 'lodash'

export const alignDir = {
  right: [3, 6, 9],
  left: [1, 4, 7]
}

export const alignment = {
  numpad: {
    1: [2, 2], // Bottom left
    2: [2, 50], // Bottom center
    3: [2, 2], // Bottom right
    4: [50, 2], // Middle left
    5: [50, 50], // Middle center
    6: [50, 2], // Middle right
    7: [2, 2], // Top left
    8: [2, 50], // Top center
    9: [2, 2] // Top right
  },
  ssa: {
    1: [2, 2], // Bottom left
    2: [2, 50], // Bottom center
    3: [2, 2], // Bottom right
    5: [2, 2], // Top left
    6: [2, 50], // Top center
    7: [2, 2], // Top right
    9: [50, 2], // Middle left
    10: [50, 50], // Middle center
    11: [50, 2] // Middle right
  }
}

const percent = (value, res) => {
  return Math.round((value / res) * 100)
}

export const getPosition = (style, info) => {
  // The idea is to reduce the resX / resY rectangle with the margins.
  // Only then, the position can be determined using the numpad alignment.
  const resX = +info.PlayResX
  const alignment = +style.Alignment
  const mR = +style.MarginR
  const mL = +style.MarginL

  const left = percent(mL, resX)
  const right = percent(mR, resX)

  const width = Math.abs(100 - right - left)

  let position
  let horiz = 'left'
  let align = 0

  if ([1, 4, 7].includes(alignment)) {
    position = left
  } else if ([3, 6, 9].includes(alignment)) {
    position = right
    horiz = 'right'
  } else if ([2, 5, 8].includes(alignment)) {
    position = (left + (100 - right)) / 2
    align = -50
  }

  return { position, width, horiz, align }
}

export const getLine = (style, info) => {
  // Following libass rules: https://github.com/libass/libass/wiki/ASSv5-Override-Tags
  const resY = +info.PlayResY
  const alignment_ = +style.Alignment
  const mV = +style.MarginV
  let line = 0
  let vert = 'bottom'

  const isTop = _.inRange(alignment_, 7, 10)
  const isBot = _.inRange(alignment_, 1, 4)

  const offsetY = percent(mV, resY)

  // <vert> is set to top if the subtitle is on the top of the screen
  // so that the origin of the cue in its top. Logical. Also, this
  // way, the text will be properly wrapped inside the screen if it takes
  // more than one line.
  // Same thing with bottom
  if (isTop) {
    // Distance is taken from the top
    line = offsetY
    vert = 'top'
  } else if (isBot) {
    // Distance is taken from the bottom
    line = offsetY
    vert = 'bottom'
  } else {
    // Should be vertically centered
    line = 50
  }

  return { line, vert }
}

export const getTextAlign = (style) => {
  // Horizontal-alignment. We assume that the file is unicoded.
  const alignment = +style.Alignment

  const textAlign = alignDir.left.includes(alignment)
    ? 'left'
    : alignDir.right.includes(alignment)
      ? 'right'
      : 'center'

  return textAlign
}

export const generateAnimation = (type, name, duration) => {
  const from = type === 'in' ? 0 : 1
  const to = type === 'in' ? 1 : 0

  return `{
      animation: ${name} ${duration}s;
      -webkit-animation: ${name} ${duration}s;
      -moz-animation: ${name} ${duration}s;
      -o-animation: ${name} ${duration}s;
      -ms-animation: ${name} ${duration}s;
    }
    @keyframes ${name} {
      from { opacity: ${from};}
      to { opacity: ${to}; }
    }
    @-webkit-keyframes ${name} {
      from { opacity: ${from};}
      to { opacity: ${to}; }
    }
    @-moz-keyframes ${name} {
      from { opacity: ${from};}
      to { opacity: ${to}; }
    }
    @-ms-keyframes ${name} {
      from { opacity: ${from};}
      to { opacity: ${to}; }
    }
    @-o-keyframes ${name} {
      from { opacity: ${from};}
      to { opacity: ${to}; }
    }
  `
}
