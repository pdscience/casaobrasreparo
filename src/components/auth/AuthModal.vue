<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { CATEGORIES } from '../../lib/categories'
import { X, LogIn, User, Wrench } from 'lucide-vue-next'

const {
  showAuth, authView, authRole, authError, authLoading,
  loginEmail, loginPassword, registerForm,
  handleLogin, handleRegister,
} = useAuth()

const logoUrl = '/logo_casa.png'
</script>

<template>
<!-- AUTH MODAL (LOGIN / REGISTER) -->
<div class="fixed inset-0 z-50 overflow-y-auto">
  <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAuth = false"></div>
  <div class="relative min-h-full flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
      <div class="relative bg-slate-950 p-6 border-b border-slate-800 overflow-hidden">
        <div class="absolute -top-20 -right-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-2">
            <img :src="logoUrl" alt="Casa Obras e Reparos" class="w-9 h-9 rounded-xl object-cover" />
            <h2 class="font-black text-white text-lg tracking-tight">
              {{ authView === 'login' ? 'Entrar' : 'Criar Conta' }}
              <span class="block text-[11px] font-medium text-slate-400">Casa Obras e Reparos</span>
            </h2>
          </div>
          <button @click="showAuth = false" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="p-6 space-y-5">
        <!-- VIEW SWITCH -->
        <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex">
          <button
            @click="authView = 'login'; authError = ''"
            :class="[
              'flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              authView === 'login' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
            ]"
          >
            <LogIn class="w-3.5 h-3.5 inline mr-1" /> Entrar
          </button>
          <button
            @click="authView = 'register'; authError = ''"
            :class="[
              'flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              authView === 'register' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
            ]"
          >
            <User class="w-3.5 h-3.5 inline mr-1" /> Cadastrar
          </button>
        </div>

        <!-- LOGIN FORM -->
        <form v-if="authView === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
            <input
              v-model="loginEmail"
              type="email"
              required
              placeholder="seu@email.com"
              class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Senha *</label>
            <input
              v-model="loginPassword"
              type="password"
              required
              placeholder="Sua senha"
              class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
            />
          </div>

          <div v-if="authError" class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <X class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p class="text-xs text-red-300">{{ authError }}</p>
          </div>

          <button
            type="submit"
            :disabled="authLoading"
            class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            <LogIn class="w-4 h-4" />
            {{ authLoading ? 'Entrando...' : 'Entrar' }}
          </button>

          <p class="text-center text-xs text-slate-400">
            Ainda não tem conta?
            <button type="button" @click="authView = 'register'; authError = ''" class="text-amber-400 font-bold hover:underline">Cadastre-se</button>
          </p>
        </form>

        <!-- REGISTER FORM -->
        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <!-- ROLE TOGGLE -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Eu sou...</label>
            <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
              <button
                type="button"
                @click="authRole = 'client'"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  authRole === 'client' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                ]"
              >
                <User class="w-3.5 h-3.5" /> Cliente
              </button>
              <button
                type="button"
                @click="authRole = 'pro'"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  authRole === 'pro' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'text-slate-400 hover:text-white'
                ]"
              >
                <Wrench class="w-3.5 h-3.5" /> Profissional
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Nome completo *</label>
              <input
                v-model="registerForm.name"
                type="text"
                required
                placeholder="Seu nome"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Data de nascimento</label>
              <input
                v-model="registerForm.birth_date"
                type="date"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
            <input
              v-model="registerForm.email"
              type="email"
              required
              placeholder="seu@email.com"
              class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Senha * <span class="text-slate-500 font-normal">(mínimo 6 caracteres)</span></label>
            <input
              v-model="registerForm.password"
              type="password"
              required
              placeholder="Crie uma senha"
              class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
            />
          </div>

          <div v-if="authRole === 'pro'">
            <label class="block text-xs font-bold text-slate-300 mb-1.5">Categoria *</label>
            <select
              v-model="registerForm.category"
              required
              class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
            >
              <option value="">Selecione a categoria...</option>
              <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Endereço</label>
              <input
                v-model="registerForm.address"
                type="text"
                placeholder="Rua, número"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Bairro</label>
              <input
                v-model="registerForm.bairro"
                type="text"
                placeholder="Seu bairro"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Cidade</label>
              <input
                v-model="registerForm.cidade"
                type="text"
                placeholder="Sua cidade"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">UF</label>
              <input
                v-model="registerForm.uf"
                type="text"
                maxlength="2"
                placeholder="UF"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all uppercase"
              />
            </div>
          </div>

          <div v-if="authError" class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <X class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p class="text-xs text-red-300">{{ authError }}</p>
          </div>

          <button
            type="submit"
            :disabled="authLoading"
            class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            <User class="w-4 h-4" />
            {{ authLoading ? 'Criando conta...' : 'Criar Conta' }}
          </button>

          <p class="text-center text-xs text-slate-400">
            Já tem conta?
            <button type="button" @click="authView = 'login'; authError = ''" class="text-amber-400 font-bold hover:underline">Entrar</button>
          </p>
        </form>
      </div>
    </div>
  </div>
</div>
</template>
