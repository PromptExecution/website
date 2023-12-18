<!-- src/views/Login.vue -->
<template>
    <div>
        <h1>Login</h1>
        <button @click="loginWithKinde">Login with Kinde</button>
    </div>
</template>

<script lang="ts">
import { inject } from 'vue';

export default {
    setup() {
        const kindeAuth = inject('kindeAuth');

        const loginWithKinde = () => {
            kindeAuth.login();
        };

        return { loginWithKinde };
    },
};
</script>

