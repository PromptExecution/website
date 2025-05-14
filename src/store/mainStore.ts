// src/store/mainStore.ts
import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    count: 0,
    // cookieConsent: null // null, 'accepted', or 'rejected'
    cookieConsent: localStorage.getItem('cookieConsent'),
    showLogin: false,
    showDebugPanel: false,
  }),
  actions: {
    increment() {
      this.count++
    },
    setCookieConsent(value: 'accepted' | 'rejected') {
      this.cookieConsent = value
      localStorage.setItem('cookieConsent', value)
    },
    resetCookieConsent() {
      this.cookieConsent = null;
      localStorage.removeItem('cookieConsent');
    },
    toggleLogin() {
      this.showLogin = !this.showLogin;
      },
    toggleDebugPanel() {
      this.showDebugPanel = !this.showDebugPanel;
    }
  },
  getters: {
    isCookieConsentSet: (state) => state.cookieConsent !== null
  }
})

