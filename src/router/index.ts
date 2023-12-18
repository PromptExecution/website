// existing src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home.vue';
import { useMainStore } from '@/store';
import { useKindeAuth } from '@/plugins/useKindeAuth';


// now we'll lazy load about
// import About from '@/views/About.vue';


const routes = [
  { path: '/', name: 'Home', component: Home },
  // example of redirect: { name: 'Home'} or redirect: to=>'/' ( could be a function)
  { path: '/home', redirect: "/" },
  // or we could use alias
  // { path: '/home', alias: "/", name: 'Home', component: Home },

  { path: '/about', name: 'About', component: ()=>import('@/views/About.vue') },
  {
    path: '/admin',
    name: 'Admin',
    component: ()=>import('@/views/Admin.vue'),
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: ()=>import('@/views/Login.vue'),
  },
  // { path: '/destination/:id', name: 'destination.show', component: ()=>import('@/views/DestinationShow.vue')  }
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: ()=>import('@/views/NotFound404.vue')  }
]

const router = createRouter({
  // createWebHashHistory is alt /#/
  history: createWebHistory(),
  routes: routes,
  linkActiveClass: 'such-active',
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
    return savedPosition || new Promise((resolve)=>{
      // allow for transitions!
      setTimeout(()=>{
        resolve({ top: 0, behavior: 'smooth' });
      }, 500);
    })
    // console.log(to, from, savedPosition);
    // if (savedPosition) {
    //   return savedPosition;
    // }
    // return { top: 0 };
  }
});

// router.beforeEach((to, from) => {
//   const mainStore = useMainStore();

//   if (to.meta.requiresAuth) {
//     console.log('requires auth!');
//     const isAuth = mainStore.user ? true : false;

//     if (!isAuth) {
//       return {
//         name: 'Login'
//       };
//     }
//   }
// });

router.beforeEach((to, from) => {
  const kindeAuth = useKindeAuth();

  if (to.meta.requiresAuth && !kindeAuth.isAuthenticated.value) {
    return {
      name: 'Login',
      // Optionally, add query params to redirect after login
      query: { redirect: to.fullPath }
    };
  }
});

export default router