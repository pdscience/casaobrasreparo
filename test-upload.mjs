import { createClient } from '@insforge/sdk'

const insforge = createClient({
  baseUrl: process.env.VITE_INSFORGE_URL || 'https://6bcfg7xt.us-east.insforge.app',
  anonKey: process.env.VITE_INSFORGE_ANON_KEY || 'anon_21d142f6c5741174263265e758066f7ba967bbdc11658c7464b280a1a02a36d0',
})

async function testUpload() {
  // Create a simple test file
  const testContent = 'Hello, this is a test file'
  const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })

  console.log('Attempting upload...')
  const { data, error } = await insforge.storage
    .from('professional-avatars')
    .upload('test-upload.txt', testFile)

  if (error) {
    console.error('Upload error:', error)
    process.exit(1)
  }

  console.log('Upload successful!')
  console.log('URL:', data.url)
  console.log('Key:', data.key)

  // Clean up - delete the test file
  const { error: deleteError } = await insforge.storage
    .from('professional-avatars')
    .remove(data.key)

  if (deleteError) {
    console.error('Delete error:', deleteError)
  } else {
    console.log('Test file deleted successfully')
  }
}

testUpload().catch(console.error)