import { computed, ref } from 'vue'
import { buildGroupedRows } from '../utils/animePinyin'

function normalizeKeyword(value) {
  return value.trim().toLocaleLowerCase()
}

export function useAnimeSearch(itemsRef) {
  const activeKeyword = ref('')

  const visibleItems = computed(() => {
    const keyword = normalizeKeyword(activeKeyword.value)

    return itemsRef.value
      .map((value, originalIndex) => ({
        value,
        originalIndex
      }))
      .filter((entry) => {
        if (!keyword) {
          return true
        }

        return normalizeKeyword(entry.value).includes(keyword)
      })
  })

  const visibleRows = computed(() => buildGroupedRows(visibleItems.value))

  const countLabel = computed(() => {
    if (!activeKeyword.value.trim()) {
      return `共 ${itemsRef.value.length} 项`
    }

    return `筛选 ${visibleItems.value.length} / 总 ${itemsRef.value.length} 项`
  })

  function queryAnime(keyword) {
    activeKeyword.value = keyword.trim()
  }

  return {
    activeKeyword,
    countLabel,
    visibleItems,
    visibleRows,
    queryAnime
  }
}
