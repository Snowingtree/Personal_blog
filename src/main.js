import { createApp } from 'vue'
import SnowingressMyComponents from 'snowingress-my-components'
import 'snowingress-my-components/style.css'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(router).use(SnowingressMyComponents).mount('#app')
