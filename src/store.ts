// src/store.js
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
    setCookieConsent(value) {
      this.cookieConsent = value
      localStorage.setItem('cookieConsent', value)
    },
    resetCookieConsent() {
      this.cookieConsent = null;
      localStorage.removeItem('cookieConsent');
    },
    toggleLogin(show) {
      this.showLogin = !this.showLogin;
      },
    toggleDebugPanel(show) {
      this.showDebugPanel = !this.showDebugPanel;
    }
  },
  getters: {
    isCookieConsentSet: (state) => state.cookieConsent !== null
  }
})

