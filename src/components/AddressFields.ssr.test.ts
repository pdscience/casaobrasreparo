import { describe, it, expect } from 'vitest'
import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import AddressFields from './AddressFields.vue'
import PhoneInput from './PhoneInput.vue'

describe('AddressFields e PhoneInput (render SSR)', () => {
  it('renderiza o AddressFields com pais, estado e municipio', async () => {
    const app = createSSRApp({
      components: { AddressFields },
      setup() {
        const countryCode = ref('BR')
        const stateCode = ref('SP')
        const stateName = ref('São Paulo')
        const municipality = ref('São Paulo')
        return { countryCode, stateCode, stateName, municipality }
      },
      template: `<AddressFields v-model:country-code="countryCode" v-model:state-code="stateCode" v-model:state-name="stateName" v-model:municipality="municipality" />`,
    })
    const html = await renderToString(app)
    expect(html).toContain('São Paulo')
    expect(html).toContain('Brasil')
    expect(html).toContain('+55')
  })

  it('renderiza o PhoneInput com mascara por pais', async () => {
    const app = createSSRApp({
      components: { PhoneInput },
      setup() {
        const phone = ref('+5511987654321')
        const phoneCountry = ref('BR')
        return { phone, phoneCountry }
      },
      template: `<PhoneInput v-model:phone="phone" v-model:phone-country="phoneCountry" />`,
    })
    const html = await renderToString(app)
    expect(html).toContain('98765-4321')
    expect(html).toContain('+55')
  })

  it('renderiza o AddressFields sem rua para o profissional', async () => {
    const app = createSSRApp({
      components: { AddressFields },
      setup() {
        const countryCode = ref('US')
        return { countryCode }
      },
      template: `<AddressFields :with-street="false" v-model:country-code="countryCode" />`,
    })
    const html = await renderToString(app)
    expect(html).toContain('Estados Unidos')
    expect(html).not.toContain('Rua, número')
  })
})
