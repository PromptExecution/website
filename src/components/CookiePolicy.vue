<!-- CookiePolicy.vue -->
<template>
  <div>
    <!-- Cookie policy content -->
    <input type="checkbox" v-model="allowCookies" /> Accept Cookies
  </div>
</template>

<script>
import { useCookies } from './useCookies'
export default {
  setup() {
    const { allowCookies } = useCookies()
    return { allowCookies }
  }
}
</script>

