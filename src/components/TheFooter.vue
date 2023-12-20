<template>
  <div class="footy">
    <!--
      define new icons in types/vue-icons.d.ts
    -->
      <a target="_blank" href="http://linkedin.com/company/promptexecution/">
        <uil-linkedin size="16px" class="logo" /> ABN 456 5038 5466
        <!-- <a target="_blank" href="https://abr.business.gov.au/ABN/View?id=45650385466"> -->
      </a>
      &nbsp;&nbsp;
      <a target="_blank" href="callto://+(61) 3 4238 2424">
        <uil-phone size="16px" class="logo" /> +(61) 3 4238 2424</a>
      &nbsp;&nbsp;
      <a target="_blank" href="mailto:hello@promptexecution.com">
        <uil-mailbox size="16px" class="logo" /> hello@promptexecution.com
      </a>
      &nbsp;&nbsp;
  </div>
</template>


<script lang="ts">

// 😱 don't use this line it's VERY SLOW because it loads EVERYTHING!!
// import { UilLinkedin, UilHunting, UilMailbox, UilPhone } from '@iconscout/vue-unicons'
import UilLinkedin from '@iconscout/vue-unicons/icons/uil-linkedin.vue';
import UilHunting from '@iconscout/vue-unicons/icons/uil-hunting.vue';
import UilMailbox from '@iconscout/vue-unicons/icons/uil-mailbox.vue';
import UilPhone from '@iconscout/vue-unicons/icons/uil-phone.vue';

export default {
  components: {
    UilLinkedin,
    UilHunting,
    UilMailbox,
    UilPhone
  }
}

</script>


<style scoped>
.footy {
    font-family: 'PEPatron-PersonalUse-Regular', 'PEExodarOutline', 'Roboto'; /* sans-serif; */
    font-size: 0.8em;

    vertical-align: middle;
}
.footy a:link {
    color: grey;
}

.footy a:hover {
    color: #646cff;
}
</style>