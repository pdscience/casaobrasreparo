import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import PortfolioManager from './PortfolioManager.vue'

function render(items: { url: string; caption: string }[]) {
  const app = createSSRApp({
    components: { PortfolioManager },
    setup: () => ({ items }),
    template: `<PortfolioManager professional-id="pro-1" owner-id="auth-1" :items="items" />`,
  })
  return renderToString(app)
}

describe('PortfolioManager (render SSR)', () => {
  it('mostra contador, legenda e opcao de adicionar', async () => {
    const html = await render([{ url: 'https://cdn.test/foto-1.jpg', caption: 'Pintura' }])
    expect(html).toContain('https://cdn.test/foto-1.jpg')
    expect(html).toContain('Pintura')
    expect(html).toContain('1/3')
    expect(html).toContain('Adicionar foto')
    expect(html).toContain('Mostre até 3 trabalhos')
  })

  it('bloqueia novas fotos ao atingir o limite de 3', async () => {
    const items = [1, 2, 3].map((n) => ({ url: `https://cdn.test/foto-${n}.jpg`, caption: '' }))
    const html = await render(items)
    expect(html).toContain('3/3')
    expect(html).toContain('Você já usou as 3 fotos da galeria.')
    expect(html).not.toContain('Adicionar foto')
  })
})
