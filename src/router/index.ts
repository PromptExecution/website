
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home.vue';

// now we'll lazy load about
// import About from '@/views/About.vue';


const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: ()=>import('@/views/About.vue') },
  {
    path: '/admin',
    name: 'Admin',
    component: ()=>import('@/views/Admin.vue'),
    meta: {
      requiresAuth: true
    },
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

export default router