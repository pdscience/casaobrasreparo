<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Camera, User, Loader2, AlertCircle, MapPin } from 'lucide-vue-next'
import type { Professional, User as UserProfile } from '../types'
import { uploadProfessionalAvatar, updateProfessional, updateUserRecord, createProfessional } from '../api/insforgeService'

const props = defineProps<{
  open: boolean
  role: 'pro' | 'client'
  professional: Professional | null
  user: UserProfile | null
  categories: string[]
  authId: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', payload: Professional | UserProfile): void
}>()

const saving = ref(false)
const errorMessage = ref('')

const name = ref('')
const category = ref('')
const email = ref('')
const phone = ref('')
const pixKey = ref('')
const bio = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const coverageBairros = ref<string[]>([])
const newBairro = ref('')
const proCidade = ref('')
const proUf = ref('')

const birthDate = ref('')
const address = ref('')
const bairro = ref('')
const cidade = ref('')
const uf = ref('')

const title = computed(() =>
  props.role === 'pro' && !props.professional
    ? 'Cadastrar Perfil Profissional'
    : (props.role === 'pro' ? 'Editar Perfil Profissional' : 'Editar Meus Dados'),
)
const currentAvatar = computed(() => avatarPreview.value || props.professional?.avatar || '')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errorMessage.value = ''
    saving.value = false
    avatarFile.value = null
    avatarPreview.value = null

    if (props.role === 'pro') {
      name.value = props.professional?.name ?? ''
      category.value = props.professional?.category ?? ''
      email.value = props.professional?.email ?? ''
      phone.value = props.professional?.phone ?? ''
      pixKey.value = props.professional?.pix_key ?? ''
      bio.value = props.professional?.bio ?? ''
      coverageBairros.value = [...(props.professional?.coverage_bairros ?? [])]
      newBairro.value = ''
      proCidade.value = props.professional?.cidade ?? ''
      proUf.value = props.professional?.uf ?? ''
      return
    }

    name.value = props.user?.name ?? ''
    birthDate.value = props.user?.birth_date ?? ''
    address.value = props.user?.address ?? ''
    bairro.value = props.user?.bairro ?? ''
    cidade.value = props.user?.cidade ?? ''
    uf.value = props.user?.uf ?? ''
  },
)

function handleAvatarUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onloadend = () => {
    avatarPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function addBairro() {
  const value = newBairro.value.trim()
  if (!value) return
  const exists = coverageBairros.value.some((b) => b.toLowerCase() === value.toLowerCase())
  if (!exists) coverageBairros.value.push(value)
  newBairro.value = ''
}

function removeBairro(index: number) {
  coverageBairros.value.splice(index, 1)
}

function fail(message: string) {
  errorMessage.value = message
}

async function handleSave() {
  errorMessage.value = ''
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    fail('Informe o nome.')
    return
  }

  if (props.role === 'pro') {
    const professional = props.professional
    if (!professional) {
      // Modo cadastro: cria a linha do profissional vinculada ao login atual
      if (!props.authId) {
        fail('Faça login novamente para cadastrar o perfil.')
        return
      }
      const createDigits = phone.value.replace(/\D/g, '')
      if (createDigits.length < 10 || createDigits.length > 11) {
        fail('Informe um telefone válido com DDD (10 ou 11 dígitos).')
        return
      }
      saving.value = true
      try {
        const ownerId = props.authId
        const avatarUrl = avatarFile.value ? await uploadProfessionalAvatar(avatarFile.value, ownerId) : ''
        const created = await createProfessional({
          name: trimmedName,
          category: category.value,
          email: email.value.trim(),
          phone: phone.value,
          pix_key: pixKey.value,
          bio: bio.value,
          coverage_bairros: [...coverageBairros.value],
          cidade: proCidade.value.trim(),
          uf: proUf.value.trim().toUpperCase(),
          avatar: avatarUrl,
          auth_id: ownerId,
          rating: 0,
          reviews_count: 0,
          plan: 'gratuito',
          plan_status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          plan_expires_at: null,
          requests_this_month: 0,
          requests_reset_at: null,
        })
        emit('saved', created)
        emit('close')
      } catch (err) {
        console.error('Erro ao criar perfil profissional:', err)
        fail('Não foi possível salvar as alterações. Tente novamente.')
      } finally {
        saving.value = false
      }
      return
    }
    const digits = phone.value.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) {
      fail('Informe um telefone válido com DDD (10 ou 11 dígitos).')
      return
    }

    saving.value = true
    try {
      const ownerId = professional.auth_id
      if (avatarFile.value && !ownerId) {
        fail('Faça login novamente para enviar a foto do perfil.')
        return
      }
      const avatarUrl = avatarFile.value && ownerId ? await uploadProfessionalAvatar(avatarFile.value, ownerId) : professional.avatar
      const updated = await updateProfessional(professional.id, {
        name: trimmedName,
        category: category.value,
        email: email.value.trim(),
        phone: phone.value,
        pix_key: pixKey.value,
        bio: bio.value,
        coverage_bairros: [...coverageBairros.value],
        cidade: proCidade.value.trim(),
        uf: proUf.value.trim().toUpperCase(),
        avatar: avatarUrl,
      })
      emit('saved', updated)
      emit('close')
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      fail('Não foi possível salvar as alterações. Tente novamente.')
    } finally {
      saving.value = false
    }
    return
  }

  const user = props.user
  if (!user) return
  saving.value = true
  try {
    const payload: Partial<UserProfile> = {
      name: trimmedName,
      address: address.value,
      bairro: bairro.value,
      cidade: cidade.value,
      uf: uf.value.trim().toUpperCase(),
    }
    if (birthDate.value) payload.birth_date = birthDate.value
    const updated = await updateUserRecord(user.auth_id, payload)
    emit('saved', updated)
    emit('close')
  } catch (err) {
    console.error('Erro ao salvar dados da conta:', err)
    fail('Não foi possível salvar as alterações. Tente novamente.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="!saving && emit('close')"></div>
    <div class="relative min-h-full flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div class="relative bg-slate-950 p-6 border-b border-slate-800">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <component :is="role === 'pro' ? Camera : User" class="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 class="font-black text-white text-lg leading-tight">{{ title }}</h2>
                <p class="text-[11px] text-slate-400">Atualize suas informações</p>
              </div>
            </div>
            <button
              type="button"
              :disabled="saving"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-40"
              title="Fechar"
              @click="emit('close')"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <!-- PRESTADOR: FOTO -->
          <div v-if="role === 'pro'" class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
              <img v-if="currentAvatar" :src="currentAvatar" alt="Foto de perfil" class="w-full h-full object-cover" />
              <User v-else class="w-6 h-6 text-slate-500" />
            </div>
            <label class="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-all flex items-center gap-1.5">
              <Camera class="w-3.5 h-3.5" />
              Escolher Foto
              <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
            </label>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Nome</label>
            <input
              v-model="name"
              type="text"
              :placeholder="role === 'pro' ? 'Nome profissional' : 'Seu nome'"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          <!-- PRESTADOR -->
          <template v-if="role === 'pro'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Categoria</label>
                <select
                  v-model="category"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                >
                  <option value="" disabled>Selecione a categoria</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail para Assinatura</label>
                <input
                  v-model="email"
                  type="email"
                  placeholder="voce@email.com"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp de Atendimento</label>
                <input
                  v-model="phone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Chave PIX para Recibos</label>
                <input
                  v-model="pixKey"
                  type="text"
                  placeholder="CPF, e-mail ou chave"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>
            <div class="grid grid-cols-[1fr_88px] gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Cidade de atendimento</label>
                <input
                  v-model="proCidade"
                  type="text"
                  placeholder="Sua cidade"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">UF</label>
                <input
                  v-model="proUf"
                  type="text"
                  maxlength="2"
                  placeholder="UF"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all uppercase"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Biografia / Experiência</label>
              <textarea
                v-model="bio"
                rows="3"
                placeholder="Conte sua experiência, tempo de atuação e diferenciais..."
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all resize-none"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Bairros de cobertura de serviço</label>
              <div v-if="coverageBairros.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="(bairro, idx) in coverageBairros"
                  :key="bairro"
                  class="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300"
                >
                  <MapPin class="w-3 h-3" />
                  {{ bairro }}
                  <button
                    type="button"
                    class="text-amber-400/70 hover:text-red-400 transition-all"
                    :title="`Remover ${bairro}`"
                    @click="removeBairro(idx)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newBairro"
                  type="text"
                  placeholder="Digite o bairro e pressione Enter"
                  class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                  @keydown.enter.prevent="addBairro"
                />
                <button
                  type="button"
                  class="px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all shrink-0"
                  @click="addBairro"
                >
                  Adicionar
                </button>
              </div>
              <p class="text-[10px] text-slate-500 mt-1.5">Aparece no seu card do catálogo. Deixe vazio para "Atende toda a região".</p>
            </div>
          </template>

          <!-- CLIENTE -->
          <template v-else>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Data de nascimento</label>
              <input
                v-model="birthDate"
                type="date"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Endereço</label>
              <input
                v-model="address"
                type="text"
                placeholder="Rua, número"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Bairro</label>
              <input
                v-model="bairro"
                type="text"
                placeholder="Seu bairro"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Cidade</label>
                <input
                  v-model="cidade"
                  type="text"
                  placeholder="Sua cidade"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">UF</label>
                <input
                  v-model="uf"
                  type="text"
                  maxlength="2"
                  placeholder="UF"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all uppercase"
                />
              </div>
            </div>
          </template>

          <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p class="text-xs text-red-300">{{ errorMessage }}</p>
          </div>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              :disabled="saving"
              @click="handleSave"
              class="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
              {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
            <button
              type="button"
              :disabled="saving"
              @click="emit('close')"
              class="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
