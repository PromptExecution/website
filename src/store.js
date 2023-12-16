// src/store.js
import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    count: 0,
    // cookieConsent: null // null, 'accepted', or 'rejected'
    cookieConsent: localStorage.getItem('cookieConsent')
  }),
  actions: {
    increment() {
      this.count++
    },
    setCookieConsent(value) {
      this.cookieConsent = value
      localStorage.setItem('cookieConsent', value)
    }
  },
  getters: {
    isCookieConsentSet: (state) => state.cookieConsent !== null
  }
})

