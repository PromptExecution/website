<!-- CookieBanner.vue -->
<template>
  <div class="cookie-banner">
    <!-- Cookie banner content -->
    🍪 Do you want milk with your cookies? 
    <button @click="handleConsent" class="accept-button">Accept Cookies</button>
    <button @click="handleReject" class="reject-button">Reject Cookies</button>

</div>
</template>

<script lang="ts">
import useCookies from '../useCookies'; 
import { defineComponent, getCurrentInstance } from 'vue';

export default defineComponent({
  setup() {
    const instance = getCurrentInstance();
    const gtag = instance?.appContext.config.globalProperties.$gtag;

    const { allowCookies } = useCookies(gtag);

    const handleConsent = () => {
      allowCookies.value = true;
      if (gtag) {
        gtag.optIn();
      }
    };

    const handleReject = () => {
      allowCookies.value = false;
      if (gtag) {
        gtag.optOut();
      }
    };

    return { handleConsent, handleReject };
  }
});
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #fff; /* Or any color you prefer */
  color: #000;
  padding: 20px;
  box-shadow: 0px -2px 10px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.accept-button {
  background-color: green;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px;
  cursor: pointer;
}

.reject-button {
  background-color: grey;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px;
  cursor: pointer;
}

/* Optional: Add hover effects */
.accept-button:hover {
  background-color: darkgreen;
}

.reject-button:hover {
  background-color: darkgrey;
}
</style>