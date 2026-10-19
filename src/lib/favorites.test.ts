import { describe, it, expect } from 'vitest'
import {
  FAVORITES_KEY,
  parseFavorites,
  readFavorites,
  toggleFavoriteId,
  writeFavorites,
} from '../composables/useFavorites'

function fakeStorage(initial?: string) {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set(FAVORITES_KEY, initial)
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    map,
  }
}

describe('favorites', () => {
  it('faz parse tolerante a storage corrompido', () => {
    expect(parseFavorites(null)).toEqual([])
    expect(parseFavorites('{oops')).toEqual([])
    expect(parseFavorites('{"a":1}')).toEqual([])
    expect(parseFavorites('["a",2,"b"]')).toEqual(['a', 'b'])
  })

  it('alterna um id sem mutar a lista original', () => {
    const base = ['a']
    const added = toggleFavoriteId(base, 'b')
    expect(added).toEqual(['a', 'b'])
    expect(base).toEqual(['a'])
    expect(toggleFavoriteId(added, 'a')).toEqual(['b'])
  })

  it('le e grava no storage injetado', () => {
    const storage = fakeStorage()
    writeFavorites(['a', 'b'], storage)
    expect(readFavorites(storage)).toEqual(['a', 'b'])
    expect(storage.map.get(FAVORITES_KEY)).toBe('["a","b"]')
  })

  it('nao lanca quando o storage falha', () => {
    const broken = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }
    expect(readFavorites(broken)).toEqual([])
    expect(() => writeFavorites(['a'], broken)).not.toThrow()
  })
})
