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
export default {
    data() {
        return {
            username: '',
            password: '',
        };
    },
    methods: {
        // Auth user against API
        login() {
            window.user = this.username
            this.$router.push({ name: 'Admin' });
            alert(`Username: ${this.username} Password: ${this.password}`);
        },
    },

};
</script>
