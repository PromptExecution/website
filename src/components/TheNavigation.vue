<template>
    <div id="nav">
        <AppLink to="/">Home</AppLink> |
        <AppLink to="/about">About</AppLink>
        <!-- <router-link
            v-for="destination in destinations"
            :key="destination.id"
            :to="{ name: 'DestinationShow', params: { id: destination.id } }"
            :class="{ 'such-active': destination.id === $route.params.id }"
        >
            {{ destination.name }}
        </router-link> -->
        |
        <!--
        <router-link to="/admin">Dashboard</router-link>
    -->
        <AppLink :to="{name: 'Admin'}">Dashboard</AppLink>
        |
        <AppLink to="http://google.com">Google</AppLink>
    </div>
</template>

<!-- <script>
import sourceData from '@/data.json';
export default {
    data() {
        return {
            destinations: sourceData.destinations,
        };
    },
}

</script> -->

<style lang="css">

#nav {
    padding: 30px;
    background-color: #f0f0f0;
}

#nav .such-active {
    color: navy;
    border-bottom: 2px solid blue;
}

</style>