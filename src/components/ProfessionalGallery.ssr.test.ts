import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ProfessionalGallery from './ProfessionalGallery.vue'

describe('ProfessionalGallery (render SSR)', () => {
  it('renderiza as fotos com legenda e fallback', async () => {
    const photos = [
      { url: 'https://cdn.test/foto-1.jpg', caption: 'Instalação elétrica' },
      { url: 'https://cdn.test/foto-2.jpg', caption: '' },
    ]
    const app = createSSRApp({
      components: { ProfessionalGallery },
      setup: () => ({ photos }),
      template: `<ProfessionalGallery :photos="photos" />`,
    })
    const html = await renderToString(app)
    expect(html).toContain('https://cdn.test/foto-1.jpg')
    expect(html).toContain('https://cdn.test/foto-2.jpg')
    expect(html).toContain('Instalação elétrica')
    expect(html).toContain('Trabalho realizado')
    expect(html).toContain('Ampliar foto')
    expect(html).not.toContain('role="dialog"')
  })

  it('nao renderiza nada sem fotos', async () => {
    const app = createSSRApp({
      components: { ProfessionalGallery },
      setup: () => ({ photos: [] }),
      template: `<ProfessionalGallery :photos="photos" />`,
    })
    const html = await renderToString(app)
    expect(html).not.toContain('<img')
  })
})
