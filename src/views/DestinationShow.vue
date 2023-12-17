

<template>
    <!--
        the v-if="destination" is a guard to prevent the DYNAMIC
        component from rendering
    -->
    <section v-if="destination" class="destination">
    <div>
        <h1>{{ destination.name }}</h1>
        <h2>Hello Destination {{ $route.params.id }}</h2>
    </div>
    </section>
</template>

<script lang="ts">

import sourceData from '@/data.json'

export default {
    computed:{
        destinationId(){
            return parseInt(this.$route.params.id)
        },
        destination(){
            return sourceData.destinations.find(
                destination => destination.id === this.destinationId
            )
        }
    }
}
</script>