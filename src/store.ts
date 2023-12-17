// src/store.js
import { defineStore } from 'pinia'
import axios from 'axios';
import { AppConfig } from './types/config'; // Import the interface

export const useMainStore = defineStore('main', {
  state: () => ({
    count: 0,
    // cookieConsent: null // null, 'accepted', or 'rejected'
    cookieConsent: localStorage.getItem('cookieConsent'), 
    showLogin: false,
    showDebugPanel: false,
    config: null as AppConfig | null, // static config .. Use the AppConfig interface
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
    },
    async getConfig() {
      try {
        const response = await axios.get('/config.json');
        this.config = response.data as AppConfig;
        // this.config = response.data;
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    },
  },
  getters: {
    isCookieConsentSet: (state) => state.cookieConsent !== null
  }
})

