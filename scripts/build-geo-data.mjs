#!/usr/bin/env node
/**
 * Gera os dados geográficos estáticos do app.
 * Fonte: country-state-city (devDependency) + libphonenumber-js (DDI de fallback).
 * Rodar: node scripts/build-geo-data.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Country, State, City } from 'country-state-city'
import { getCountryCallingCode } from 'libphonenumber-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src/data/geo')
const regionsDir = join(outDir, 'regions')

function dialFor(isoCode, fallback) {
  if (fallback) return String(fallback)
  try {
    return String(getCountryCallingCode(isoCode))
  } catch {
    return ''
  }
}

const countries = Country.getAllCountries()
  .map((c) => ({ code: c.isoCode, dial: dialFor(c.isoCode, c.phonecode), flag: c.flag }))
  .filter((c) => c.code && c.dial)
  .sort((a, b) => a.code.localeCompare(b.code))

const statesByCountry = new Map()
for (const s of State.getAllStates()) {
  if (!s.countryCode) continue
  if (!statesByCountry.has(s.countryCode)) statesByCountry.set(s.countryCode, [])
  statesByCountry.get(s.countryCode).push({ code: s.isoCode || '', name: s.name })
}

const citiesByCountry = new Map()
for (const c of City.getAllCities()) {
  if (!c.countryCode) continue
  if (!citiesByCountry.has(c.countryCode)) citiesByCountry.set(c.countryCode, new Map())
  const byState = citiesByCountry.get(c.countryCode)
  const key = c.stateCode || ''
  if (!byState.has(key)) byState.set(key, new Set())
  byState.get(key).add(c.name)
}

await rm(regionsDir, { recursive: true, force: true })
await mkdir(regionsDir, { recursive: true })
await writeFile(join(outDir, 'countries.json'), `${JSON.stringify(countries)}\n`)

for (const country of countries) {
  const region = {
    code: country.code,
    states: (statesByCountry.get(country.code) || []).sort((a, b) => a.name.localeCompare(b.name)),
    cities: Object.fromEntries(
      [...(citiesByCountry.get(country.code) || new Map())].map(([stateCode, names]) => [
        stateCode,
        [...names].sort((a, b) => a.localeCompare(b)),
      ]),
    ),
  }
  await writeFile(join(regionsDir, `${country.code}.json`), `${JSON.stringify(region)}\n`)
}

console.log(`countries: ${countries.length} | regions: ${countries.length}`)
