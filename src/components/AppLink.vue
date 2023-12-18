<!--
    https://vueschool.io/lessons/extending-router-link-for-external-urls

-->
<template>
    <a v-if="isExternal" :href="to"><slot /></a>
    <!-- <router-link v-bind="$props" v-if="isExternal" :to="null" :href="to" tag="a"></router-link> -->
    <router-link v-bind="$props" v-else><slot /></router-link>
</template>

<script lang="ts">
import {RouterLink} from 'vue-router'
export default {
    props: {
        ...RouterLink.props
    },
    computed: {
        isExternal(): boolean {
            // return this.to.startsWith('http')
            return typeof this.to === 'string' && this.to.startsWith('http')
        }
    }
}
</script>