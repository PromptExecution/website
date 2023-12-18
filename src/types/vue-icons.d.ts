declare module '@iconscout/vue-unicons' {
  import { DefineComponent } from 'vue';

  // Declare each icon you use as a Vue component
  export const UilVuejs: DefineComponent<{}, {}, any>;

  /*
   find node_modules/@iconscout/vue-unicons/ | grep -i "linked"
   search online:
   https://iconscout.com/unicons/solid-icons/
  */

  // Declare each icon you use as a Vue component
  export const UilLinkedin: DefineComponent<{}, {}, any>;
  export const UilLinkedinAlt: DefineComponent<{}, {}, any>;

  export const UilHunting: DefineComponent<{}, {}, any>;   // crosshairs
  export const UilMailbox: DefineComponent<{}, {}, any>;
  export const UilPhone: DefineComponent<{}, {}, any>;

  // Add additional icons as needed
  // export const UilAnotherIcon: DefineComponent<{}, {}, any>;
}