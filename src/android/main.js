import { createApp } from 'vue'
import SnowingressMyComponents from 'snowingress-my-components'
import 'snowingress-my-components/style.css'
import AndroidApp from './AndroidApp.vue'
import router from './router'
import { applyAndroidTheme, readAndroidTheme } from './theme'
import '../style.css'
import './styles.css'

applyAndroidTheme(readAndroidTheme())

createApp(AndroidApp).use(router).use(SnowingressMyComponents).mount('#app')
