<!-- CookieBanner.vue -->
<template>
  <div class="cookie-banner">
    <!-- Cookie banner content -->
    <button @click="handleConsent">Accept Cookies</button>
  </div>
</template>

<script lang="ts">
import useCookies from '../useCookies'; 

export default {
  setup() {
    const { allowCookies } = useCookies(app.config.globalProperties.$gtag)

    const handleConsent = () => {
      allowCookies.value = true
    }

    return { handleConsent }
  }
}
</script>

