import { ref, watch, computed } from 'vue';
import { useCookie } from 'vue-cookie-next';


export default function useCookies(gtag: any) {
  const cookie = useCookie();
  const allowCookies = ref<boolean>();

  // Initialize allowCookies based on the existing cookie
  const initCookieConsent = () => {
    if (cookie.isCookieAvailable('cookies_consent')) {
      allowCookies.value = cookie.getCookie('cookies_consent') === 'true';
      if (allowCookies.value) gtag.optIn();
    }
  };

  // Call this function on initialization
  initCookieConsent();

  watch(allowCookies, (newValue) => {
    if (newValue !== undefined) {
      cookie.setCookie('cookies_consent', newValue.toString(), {
        expire: '1Y' // Expires in 1 year, adjust as needed
      });
      newValue ? gtag.optIn() : gtag.optOut();
    }
  });

  const showBanner = computed(() => allowCookies.value === undefined);
  const okClicked = () => (allowCookies.value = true);

  return {
    allowCookies,
    showBanner,
    okClicked,
  };
}
