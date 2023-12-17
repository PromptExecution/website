<template id="Admin">
    <div>
        <h1>Admin</h1>
        <p>Admin page for {{ username }}</p>
        <button @click="logout">Logout</button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store'; // Import the Pinia store

export default defineComponent({
    setup() {
        const mainStore = useMainStore(); // Create an instance of the Pinia store
        const username = mainStore.user; // Access the user property from the store
        const router = useRouter();

        const logout = () => {
            mainStore.user = null; // Update the user property in the store
            router.push({ name: 'Login', hash: '#logout' });
        };

        return { username, logout };
    },
});
</script>
