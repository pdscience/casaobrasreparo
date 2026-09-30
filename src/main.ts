import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import VueECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import { router } from './router'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const app = createApp(App)
app.component('v-chart', VueECharts)
app.use(router)
app.mount('#app')
