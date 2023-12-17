<template>
  <div class="login-buttons">
    <button @click="signInWithGoogle">Sign in with Google</button>
    <button @click="signInWithGitHub">Sign in with GitHub</button>
    <button @click="signInWithEmail">Sign in with Email</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useMainStore } from '../store';

const mainStore = useMainStore();
const config = mainStore.config; // Access configuration

const signInWithGoogle = () => {
  // Redirect to SuperTokens Google sign-in URL
  if (!config) {
    throw new Error('Config is not defined');
  }
  else if (config.PROMPTEXEC_BACKEND_URL === undefined) {
    throw new Error('PROMPTEXEC_BACKEND_URL is not defined');
  } else {
    window.location.href = `${config.PROMPTEXEC_BACKEND_URL}/auth/signin/google`;
  }
};

const signInWithGitHub = () => {
  // Redirect to SuperTokens GitHub sign-in URL
  if (!config) {
    throw new Error('Config is not defined');
  }
  else if (config.PROMPTEXEC_BACKEND_URL === undefined) {
    throw new Error('PROMPTEXEC_BACKEND_URL is not defined');
  } else {
    window.location.href = `${config.PROMPTEXEC_BACKEND_URL}/auth/signin/github`;
  }
};

const signInWithEmail = () => {
  // Handle email sign-in (may open a modal or redirect to a form)
  // Implement as per your application flow
};

// Add any additional setup logic if needed
</script>

<style scoped>
.login-buttons {
  /* Your styles for the login buttons */
}
</style>
