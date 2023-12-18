// src/composables/useKindeAuth.ts
import { ref } from 'vue';
import createKindeClient from '@kinde-oss/kinde-auth-pkce-js';

const isAuthenticated = ref(false);
const kindeClient = ref(null);

async function initKindeClient() {
    kindeClient.value = await createKindeClient({
        client_id: 'f725d84a80eb41a9a700a70cae669253',
        domain: 'https://promptexecution.kinde.com',
        redirect_uri: window.location.origin,
    });
    // You can add additional logic here if needed
}

// Call initKindeClient immediately instead of in onMounted
initKindeClient();

export function useKindeAuth() {
    const login = async () => {
        if (!kindeClient.value) {
            await initKindeClient();
        }
        await kindeClient.value.login();
    };

    const logout = async () => {
        await kindeClient.value.logout();
    };

    return { isAuthenticated, login, logout };
}
