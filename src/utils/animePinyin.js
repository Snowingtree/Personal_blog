const groupOrder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const groupBoundaries = [
  ['A', '阿'],
  ['B', '芭'],
  ['C', '擦'],
  ['D', '搭'],
  ['E', '蛾'],
  ['F', '发'],
  ['G', '噶'],
  ['H', '哈'],
  ['J', '击'],
  ['K', '喀'],
  ['L', '垃'],
  ['M', '妈'],
  ['N', '拿'],
  ['O', '哦'],
  ['P', '啪'],
  ['Q', '期'],
  ['R', '然'],
  ['S', '撒'],
  ['T', '塌'],
  ['W', '挖'],
  ['X', '昔'],
  ['Y', '压'],
  ['Z', '匝']
]

const animeCollator = new Intl.Collator('zh-CN-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true
})

const initialCollator = new Intl.Collator('zh-CN-u-co-pinyin', {
  sensitivity: 'base'
})

function getGroupWeight(letter) {
  const orderIndex = groupOrder.indexOf(letter)
  return orderIndex === -1 ? groupOrder.length : orderIndex
}

export function getAnimeInitial(value) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return '#'
  }

  const firstCharacter = trimmedValue[0]

  if (/[A-Za-z]/.test(firstCharacter)) {
    return firstCharacter.toUpperCase()
  }

  for (let index = groupBoundaries.length - 1; index >= 0; index -= 1) {
    const [letter, boundary] = groupBoundaries[index]

    if (initialCollator.compare(firstCharacter, boundary) >= 0) {
      return letter
    }
  }

  return '#'
}

export function sortItemsByPinyin(list) {
  return [...list].sort((left, right) => {
    const initialDifference =
      getGroupWeight(getAnimeInitial(left)) - getGroupWeight(getAnimeInitial(right))

    if (initialDifference !== 0) {
      return initialDifference
    }

    return animeCollator.compare(left, right)
  })
}

export function parseAnimeContent(content) {
  return sortItemsByPinyin(
    content
      .split(/\r?\n/)
      .map((line) => line.replace(/^\uFEFF/, '').trim())
      .filter((line) => !/^[A-Z]$/i.test(line))
      .filter(Boolean)
  )
}

export function buildGroupedRows(entries) {
  const rows = []
  let currentInitial = ''

  entries.forEach((entry, index) => {
    const initial = getAnimeInitial(entry.value)

    if (initial !== currentInitial) {
      rows.push({
        type: 'group',
        key: `group-${initial}-${index}`,
        letter: initial
      })
      currentInitial = initial
    }

    rows.push({
      type: 'item',
      key: `item-${entry.originalIndex}-${index}`,
      value: entry.value,
      originalIndex: entry.originalIndex,
      displayIndex: index + 1
    })
  })

  return rows
}

export function serializeAnimeItems(items) {
  const rows = []
  let currentInitial = ''

  sortItemsByPinyin(items).forEach((item) => {
    const initial = getAnimeInitial(item)

    if (initial !== currentInitial) {
      rows.push(initial)
      currentInitial = initial
    }

    rows.push(item)
  })

  return `${rows.join('\r\n')}\r\n`
}
