// src/composables/useKindeAuth.ts
import { ref, onMounted } from 'vue';
import createKindeClient from '@kinde-oss/kinde-auth-pkce-js';

const isAuthenticated = ref(false);
const kindeClient = ref(null);

async function initKindeClient() {
    kindeClient.value = await createKindeClient({
        client_id: 'YOUR_CLIENT_ID',
        domain: 'https://promptexecution.kinde.com',
        redirect_uri: window.location.origin,
    });
}

export function useKindeAuth() {
    onMounted(() => {
        if (!kindeClient.value) {
            initKindeClient();
        }
    });

    const login = async () => {
        await kindeClient.value?.login();
    };

    const logout = async () => {
        await kindeClient.value?.logout();
    };

    return { isAuthenticated, login, logout };
}

