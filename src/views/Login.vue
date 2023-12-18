<template id="Login">
    <div>
        <h1>Login</h1>
        <!-- prevent == prevent browser default behavior -->
        <form @submit.prevent="login">
        <input type="text" v-model="username" placeholder="Username" class="input"/>
        <input type="password" v-model="password" placeholder="Password" class="input" />
        <button class="btn" type="submit">Login</button>
        </form>
    </div>
</template>

<script lang="ts">
import { ref } from 'vue';
import { useMainStore } from '../store';
import { useRouter, useRoute } from 'vue-router';

export default {
    setup() {
        const username = ref('');
        const password = ref('');

        const router = useRouter();
        const route = useRoute();

        const login = () => {

            const mainStore = useMainStore();

            mainStore.user = username.value;

            const redirectPath = route.query.redirect || { name: 'Admin' };
            // could also use router.replace
            router.push(redirectPath);
            // alert(`Username: ${username.value} Password: ${password.value}`);
        };

        return { username, password, login };
    },

};
</script>
