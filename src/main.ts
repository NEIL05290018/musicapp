import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Create the Vue app instance
const app = createApp(App)

// Register the router
app.use(router)

// Mount the app
app.mount('#app')
