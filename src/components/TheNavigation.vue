<template>
    <div id="nav">
        <router-link to="/">Home</router-link> |
        <router-link to="/about">About</router-link>
        <!-- <router-link
            v-for="destination in destinations"
            :key="destination.id"
            :to="{ name: 'DestinationShow', params: { id: destination.id } }"
            :class="{ 'such-active': destination.id === $route.params.id }"
        >
            {{ destination.name }}
        </router-link> -->
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