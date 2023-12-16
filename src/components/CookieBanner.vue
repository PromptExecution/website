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
import { useMainStore } from '../store';

export default defineComponent({
  setup() {
    const instance = getCurrentInstance();
    const gtag = instance?.appContext.config.globalProperties.$gtag;
    const mainStore = useMainStore();

    const { allowCookies } = useCookies(gtag);

    const handleConsent = () => {
      allowCookies.value = true;
      mainStore.setCookieConsent('accepted');
      if (gtag) {
        gtag.optIn();
      }
    };

    const handleReject = () => {
      allowCookies.value = false;
      mainStore.setCookieConsent('rejected');
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
  padding: 8px;
  box-shadow: 0px -2px 10px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.5s ease-out;

  /* Artistic Border */
  border: 2px solid #000; /* Basic solid border, change as needed */
  border-radius: 10px; /* Rounded corners */
  /* You can add more artistic styles like border-image or box-shadow for more effects */

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