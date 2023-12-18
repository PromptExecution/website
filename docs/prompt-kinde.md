I'm designing a TYPESCRIPT vue3 SPA using vite, and trying to integrate OAuth2 --
I've plumbed my application to have a page, and a login form, and I've selected an authentication service called kinde.com
I've provided the kinde Javascript SDK & my welcome page (with client id's, etc.)
some of the relevant files from my project are separated by a ---

Please give me your best guess, step by step (focus on code examples).
Do not reinvent the wheel, if there are API's or external libraries which perform the functions I need then include those.
I've already run:
```npm install @kinde-oss/kinde-auth-pkce-js```

I'll include the relevant files to be modified.

* MAKE SURE YOU design a well composed vue3 compositional component for kinde authentication

* ABSOLUTELY DO NOT WRAP the app.mount() inside an async / kinde object (instead lazy load kinde when we need it),
    I don't want to block or delay the page from loading for the login component!  it must use an app.use()
    or app.provides() style vue module syntax

* be specific with working examples from my files, BUT you don't need to include code that isn't changing.

---
FROM
https://promptexecution.kinde.com/admin/cx/_:nav&m:application_details::_:submenu&s:quick_start&id:f725d84a80eb41a9a700a70cae669253::_:action&tab:existing

Here are the instructions for kinde:
Quick start
Securely integrate a new or existing application to the Kinde platform

Technology
Change technology
Vue
We don't have an SDK for Vue yet. In the meantime the steps below can get you up and going.

Using Kinde without an SDK
Everything we build is also OAuth 2.0 standard, so you can integrate into any language framework with Kinde without an SDK.

Supported grant types for getting access tokens
Authorization Code Flow with Proof Key for Code Exchange (PKCE)
Kinde supports the PKCE extension. This is recommended for mobile apps and single page applications (SPAs) and is what we use in this guide.

Implicit flow (not supported)
Before PKCE (see above) this was the method used by applications that were unable to store secrets securely. This flow has security implications and Kinde does not support it for this reason.

OpenID Connect
To connect to Kinde you need to know where the endpoints are for things like authorization, tokens and user profiles. You’ll also need to know the response types and claims that are supported. All this data and more can be found in your OpenID configuration file which is located at:

Copied
https://promptexecution.kinde.com/.well-known/openid-configuration
Signing up and signing in
Your users must be redirected from your product to Kinde to sign up or sign in securely. The redirect URL on your product side would look like the following:

Copied
https://promptexecution.kinde.com/oauth2/auth
?response_type=code
&client_id=f725d84a80eb41a9a700a70cae669253
&redirect_uri=http://localhost:3000
&scope=openid+profile+email
&state=abc
&code_challenge=<CHALLENGE>
&code_challenge_method=S256
Make sure you replace <CHALLENGE> with your challenge.

Kinde supports all the standard OAuth 2.0 request parameters as well as a few additional Kinde-specific parameters to improve the end user experience. Full details can be found in our documentation.

After authentication your user will be redirected to http://localhost:3000?code=<CALLBACK_AUTHORIZATION_CODE>. You will need the code query parameter returned here in the next step.

Handling the callback
As mentioned before, when Kinde redirects to your project we supply an authorization code in the query string.

You need to exchange this authorization code for an access token by making a POST request to the Kinde token endpoint.


https://promptexecution.kinde.com/oauth2/token
?client_id=f725d84a80eb41a9a700a70cae669253
&grant_type=authorization_code
&redirect_uri=http://localhost:3000
&code=<CALLBACK_AUTHORIZATION_CODE>
&code_verifier=<VERIFIER>
Make sure you replace <CALLBACK_AUTHORIZATION_CODE> with the code returned in the previous step.

Note that the code_verifier parameter is also required in the PKCE flow. Replace the <VERIFIER>in the snippet above with the verifier you used in the previous step.

The response body will then contain a token that you can decode. The access token you receive can be stored and later used to make authenticated requests on behalf of the user.

Signing out your users
When user sign out, you will want to clear any session or locally stored data in your app and redirect them to your logout URL.


https://promptexecution.kinde.com/logout
This will end their session on Kinde. A new access token or refresh token needs to be issued for them to sign in again.

To add a logout URL in Kinde, update the Allowed logout redirect URLs field on Details page. Users will be redirected back to this URL when they sign out.

Verifying the Kinde access token
It’s likely you will be using a library to validate your JWTs and they will require the url for your public JSON Web Key (also known as a jwks file).

The file can be found here:


https://promptexecution.kinde.com/.well-known/jwks
What's next?
Explore all of Kinde’s functions in our docs

View the docs


----
additionally I've found the repo:
https://github.com/kinde-oss/kinde-auth-pkce-js

Kinde JavaScript
The Kinde SDK for JavaScript.

You can also use the JavaScript starter kit here.

PRs Welcome Kinde Docs Kinde Community

Documentation
Please refer to the Kinde Javacript SDK document.

Publishing
The core team handles publishing.

To publish a new package version, use the “Release and Publish to NPM” action in the “Actions” tab.

Contributing
Please refer to Kinde’s contributing guidelines.

License
By contributing to Kinde, you agree that your contributions will be licensed under its MIT License.

---

Here is the content of
https://kinde.com/docs/developer-tools/javascript-sdk/

Link to this section
If you haven’t already got a Kinde account, register for free here (no credit card required). This will give you a Kinde domain, which you need to get started, e.g. yourapp.kinde.com

You can also view the Javascript starter kit in GitHub.

Set up Kinde
Link to this section
Set your callback and logout URLs
Link to this section
Kinde will redirect your user to authenticate. They’ll be redirected back to your JavaScript app after signing in or signing up.

To authenticate your app, you need to specify which URL Kinde should redirect your user. These need to match the ones listed in your application details in Kinde.

The http://localhost:3000 is an example of a commonly used local development URL. It should be replaced with the URL where your app is running.

In Kinde, go to Settings > Applications > [your app] > View details.
Set the Allowed callback URLs (also known as redirect URIs) to the URL of your app. This is where the Kinde client app is served. For local development this could be http://localhost:3000. This is required for your users to sign in to your app successfully.
Set the URLs they’ll be redirected to after signing out, by adding Allowed logout redirect URLs to your JavaScript applications logout page. For local development this could be http://localhost:3000.
Select Save.
Environments
Link to this section
As part of your development process, we highly recommend you create a development environment within your Kinde account. In this case, you’d use the Environment subdomain in the code block above.

Set up your app
Link to this section
Add the Kinde JavaScript SDK as a dependency
Link to this section
The easiest way to install the SDK is via npm or yarn:

Copy to clipboardnpm i @kinde-oss/kinde-auth-pkce-js
Integrate with your app
Link to this section
You’ll need to create a new instance of the Kinde Auth client object.

We recommend using the async/await method. It must be the first thing that happens before you initialize your app.

Copy to clipboardimport createKindeClient from "@kinde-oss/kinde-auth-pkce-js";

(async () => {
	const kinde = await createKindeClient({
		client_id: <your_kinde_client_id>,
		domain: "https://<your_kinde_subdomain>.kinde.com",
		redirect_uri: window.location.origin
	});
}
In Kinde, go to Settings > Applications > [your app] > View details.
Replace the client_id and domain placeholders in the code block above with the the values from the App keys section.
Note: The redirect_uri value you enter here needs to be the same as the redirect URI you entered in the Kinde application (see above).

Log in / register
Link to this section
Kinde provides login / register methods that are easy to implement. Here’s an example of adding buttons to your HTML:

Copy to clipboard<div id="logged_out_view">
    <button id="login" type="button">Sign in</button>
    <button id="register" type="button">Register</button>
</div>
You can bind events to buttons.

Copy to clipboarddocument.getElementById("login").addEventListener("click", async () => {
    await kinde.login();
});

document.getElementById("register").addEventListener("click", async () => {
    await kinde.register();
});
Clicking either of these buttons redirects your user to Kinde, where they authenticate before being redirected back to your site.

Test sign up
Link to this section
Register your first user by signing up yourself. You’ll see your newly registered user on the Users page of the relevant organization in Kinde.

Handle redirect
Link to this section
Once your user is redirected back to your site from Kinde, you can set a callback to take place. The callback automatically passes in the user object and any application state you set prior to the redirect.

Copy to clipboardon_redirect_callback: (user, appState) => {
    console.log({user, appState});
    if (user) {
        // render logged in view
    } else {
        // render logged out view
    }
};
Log out
Link to this section
This is implemented in much the same way as signing in or registering. The Kinde single page application client already comes with a sign out method.

Copy to clipboarddocument.getElementById("logout").addEventListener("click", async () => {
    await kinde.logout();
});
Call your API
Link to this section
The getToken method lets you to securely call your API and pass the bearer token to validate that your user is authenticated.

Copy to clipboard(async () => {
    try {
        const token = await kinde.getToken();
        const response = await fetch(YOUR_API, {
            headers: new Headers({
                Authorization: "Bearer " + token
            })
        });
        const data = await response.json();
        console.log({data});
    } catch (err) {
        console.log(err);
    }
})();
We recommend using our middleware on your back end to verify users and protect endpoints. Our current implementation is Node/Express, but we’re working on more.

Organizations
Link to this section
For general information about using organizations, see Kinde organizations for developers.

Create an organization

To create a new organization within your application, you will need to run a similar function below.

Copy to clipboarddocument.getElementById("createOrganization").addEventListener("click", async () => await kinde.createOrg();});
Sign up / sign in users to organizations

Kinde has a unique code for every organization. You’ll have to pass this code through when you register a new user. Example function below:

Copy to clipboardkinde.register({org_code: ‘org_1234’});
If you want a user to sign into a particular organization, pass this code along with the sign in method.

Copy to clipboardkinde.login({org_code: ‘org_1234’});
Following authentication, Kinde provides a json web token (jwt) to your application. Along with the standard information we also include the org_code and the permissions for that organization (this is important as a user can belong to multiple organizations and have different permissions for each). Example of a returned token:

Copy to clipboard{
	"aud": [],
	"exp": 1658475930,
	"iat": 1658472329,
	"iss": "https://your_subdomain.kinde.com",
	"jti": "123457890",
	"org_code": "org_1234",
	"permissions": [“read:todos”, “create:todos”],
	"scp": [
		"openid",
		"profile",
		"email",
		"offline"
	],
	"sub": "kp:123457890"
}
The id_token will also contain an array of Organizations that a user belongs to - this is useful if you wanted to build out an organization switcher for example.

Copy to clipboard{
...
"org_codes": ["org_1234", "org_4567"]
...
}
There are two helper functions you can use to extract information:

Copy to clipboardkinde.getOrganization();
// {orgCode: "org_1234"}

kinde.getUserOrganizations();
// {orgCodes: ["org_1234", "org_abcd"]}
Get user information
Link to this section
Use the getUser() helper function to request the user information from Kinde.

Use the getUserProfile() function to request the latest user information from the server.

Copy to clipboardconst user = kinde.getUser();
const user = await kinde.getUserProfile();
// user will be populated with a user object
{
	id: "kp_0123456789abcdef0123456789abcdef",
	given_name: "Billy",
	family_name: "Hoyle",
	email: "billy@example.com",
	picture: "https://link_to_avatar_url.kinde.com"
}
User permissions
Link to this section
When a user signs in to an organization the Access token your product/application receives contains a custom claim with an array of permissions for that user.

You can set permissions in your Kinde account. Here’s an example.

Copy to clipboard"permissions":[
	"create:todos",
	"update:todos",
	"read:todos",
	"delete:todos",
	"create:tasks",
	"update:tasks",
	"read:tasks",
	"delete:tasks",
]
We provide helper functions to more easily access permissions:

Copy to clipboardkinde.getPermission("create:todos");
// {orgCode: "org_1234", isGranted: true}

kinde.getPermissions();
// {orgCode: "org_1234", permissions: ["create:todos", "update:todos", "read:todos"]}
A practical example in code might look something like:

Copy to clipboardif (kinde.getPermission("create:todos").isGranted) {
    // show Create Todo button in UI
}
Feature flags
Link to this section
When a user signs in the Access token your product/application receives contains a custom claim called feature_flags which is an object detailing the feature flags for that user.

You can set feature flags in your Kinde account. Here’s an example.

Copy to clipboardfeature_flags: {
  theme: {
      "t": "s",
      "v": "pink"
 },
 is_dark_mode: {
      "t": "b",
      "v": true
  },
 competitions_limit: {
      "t": "i",
      "v": 5
  }
}
In order to minimize the payload in the token we have used single letter keys / values where possible. The single letters represent the following:

t = type

v = value

s = string

b = boolean

i = integer

We provide helper functions to more easily access feature flags:

Copy to clipboard/**
  * Get a flag from the feature_flags claim of the access_token.
  * @param {string} code - The name of the flag.
  * @param {obj} [defaultValue] - A fallback value if the flag isn't found.
  * @param {'s'|'b'|'i'|undefined} [flagType] - The data type of the flag (integer / boolean / string).
  * @return {object} Flag details.
*/
kinde.getFlag(code, defaultValue, flagType);

/* Example usage */

kinde.getFlag('theme');
/*{
//   "code": "theme",
//   "type": "string",
//   "value": "pink",
//   "is_default": false // whether the fallback value had to be used
*/}

kinde.getFlag('create_competition', {defaultValue: false});
/*{
      "code": "create_competition",
      "value": false,
      "is_default": true // because fallback value had to be used
}*/
We also require wrapper functions by type which should leverage getFlag above.

Booleans:

Copy to clipboard/**
 * Get a boolean flag from the feature_flags claim of the access_token.
 * @param {string} code - The name of the flag.
 * @param {bool} [defaultValue] - A fallback value if the flag isn't found.
 * @return {bool}
 */
kinde.getBooleanFlag(code, defaultValue);

/* Example usage */
kinde.getBooleanFlag("is_dark_mode");
// true

kinde.getBooleanFlag("is_dark_mode", false);
// true

kinde.getBooleanFlag("new_feature", false);
// false (flag does not exist so falls back to default)
Strings and integers work in the same way as booleans above:

Copy to clipboard/**
 * Get a string flag from the feature_flags claim of the access_token.
 * @param {string} code - The name of the flag.
 * @param {string} [defaultValue] - A fallback value if the flag isn't found.
 * @return {string}
 */ getStringFlag(code, defaultValue);

/**
 * Get an integer flag from the feature_flags claim of the access_token.
 * @param {string} code - The name of the flag.
 * @param {int} [defaultValue] - A fallback value if the flag isn't found.
 * @return {int}
 */ getIntegerFlag(code, defaultValue);
Audience
Link to this section
An audience is the intended recipient of an access token - for example the API for your application. The audience argument can be passed to the Kinde client to request an audience be added to the provided token.

The audience of a token is the intended recipient of the token.

Copy to clipboardconst kinde = await createKindeClient({
  audience: 'api.yourapp.com'
  client_id: '<your_kinde_client_id>',
  domain: 'https://<your_kinde_subdomain>.kinde.com',
  redirect_uri: 'http://localhost:3000',
  on_redirect_callback: (user, appState) => {
		// do something}
});
For details on how to connect, see Register an API.

Overriding scope
Link to this section
By default the JavaScript SDK requests the following scopes:

profile
email
offline
openid
You can override this by passing scope into the createKindeClient

Copy to clipboardconst kinde = await createKindeClient({
    client_id: "<your_kinde_client_id>",
    domain: "https://<your_kinde_subdomain>.kinde.com",
    redirect_uri: "http://localhost:3000",
    scope: "openid"
});
Getting claims
Link to this section
We have provided a helper to grab any claim from your id or access tokens. The helper defaults to access tokens:

Copy to clipboardkinde.getClaim("aud");
// {name: "aud", "value": ["api.yourapp.com"]}

kinde.getClaim("given_name", "id_token");
// {name: "given_name", "value": "David"}
Persisting authentication state on page refresh or new tab
Link to this section
You will find that when you refresh the browser using a front-end based SDK that the authentication state is lost. This is because there is no secure way to persist this in the front-end.

There are two ways to work around this.

(Recommended) use our Custom Domains feature which then allows us to set a secure, httpOnly first party cookie on your domain.
(Non-production solution only) If you’re not yet ready to add your custom domain, or for local development, we offer an escape hatch you can provide to the Kinde Client is_dangerously_use_local_storage. This will use local storage to store the refresh token. DO NOT use this in production.
Once you implement one of the above, you don’t need to do anything else.

Persisting application state
Link to this section
The options argument passed into the login and register methods accepts an app_state key where you can pass in the current application state prior to redirecting to Kinde. This is then returned to you in the second argument of the on_redirect_callback as seen above.

A common use case is to allow redirects to the page the user was trying to access prior to authentication. This could be achieved as follows:

Login handler:

Copy to clipboardlogin({
    app_state: {
        redirectTo: window.location
    }
});
Redirect handler:

Copy to clipboardconst kinde = await createKindeClient({
    client_id: "<your_kinde_client_id>",
    domain: "https://<your_kinde_subdomain>.kinde.com",
    redirect_uri: "http://localhost:3000",
    on_redirect_callback: (user, appState) => {
        if (appState?.redirectTo) {
            window.location = appState?.redirectTo;
        }
    }
});
Token storage in the authentication state
Link to this section
By default the JWTs provided by Kinde are stored in memory. This protects you from both CSRF attacks (possible if stored as a client side cookie) and XSS attacks (possible if persisted in local storage).

The trade off with this approach however is that if a page is refreshed or a new tab is opened then the token is wiped from memory, and the sign in button would need to be clicked to re-authenticate. There are two ways to prevent this behaviour:

Use the Kinde custom domain feature. We can then set a secure, httpOnly cookie against your domain containing only the refresh token which is not vulnerable to CSRF attacks.
There is an escape hatch which can be used for local development: is_dangerously_use_local_storage. This absolutely should not be used in production and we highly recommend you use a custom domain. This will store only the refresh token in local storage and is used to silently re-authenticate.
Copy to clipboardconst kinde = await createKindeClient({
    client_id: "[YOUR_KINDE_CLIENT_ID]",
    domain: "[YOUR_KINDE_DOMAIN]",
    redirect_uri: window.location.origin,
    is_dangerously_use_local_storage: true
});
SDK API Reference - createKindeClient
Link to this section
audience
Link to this section
The audience claim for the JWT.

Type: string

Required: No

client_id
Link to this section
The unique ID of your application in Kinde.

Type: string

Required: Yes

domain
Link to this section
Either your Kinde instance URL, e.g https://yourapp.kinde.com or your custom domain.

Type: string

Required: Yes

logout_uri
Link to this section
Where your user will be redirected when they sign out.

Type: string

Required: No

is_dangerously_use_local_storage
Link to this section
An escape hatch for storing the refresh token in local storage. Recommended for local development only, and not production.

Type: boolean

Required: No

Default: false

redirect_uri
Link to this section
The URL that the user will be returned to after authentication.

Type: string

Required: Yes

scope
Link to this section
The scopes to be requested from Kinde.

Type: string

Required: No

Copy to clipboardopenid profile
email offline
SDK API Reference - kindeClient methods
Link to this section
createOrg
Link to this section
Constructs redirect url and sends user to Kinde to sign up and create a new org for your business.

usage:

Copy to clipboardkinde.createOrg();
Sample output:

Copy to clipboardredirect;
getClaim
Link to this section
Gets a claim from an access or ID token.

Arguments:

Copy to clipboardclaim: string, tokenKey?: string
Usage:

Copy to clipboardkinde.getClaim("given_name", "id_token");
Sample output:

Copy to clipboard"David";
getPermission
Link to this section
Returns the state of a given permission.

Arguments:

Copy to clipboardkey: string;
Usage:

Copy to clipboardkinde.getPermission("read:todos");
Sample output:

Copy to clipboard{
	orgCode: "org_1234",
	isGranted: true
}
getPermissions
Link to this section
Returns all permissions for the current user for the organization they are signed in to.

Usage:

Copy to clipboardkinde.getPermissions();
Sample output:

Copy to clipboard{
	orgCode:"org_1234",
	permissions:["create:todos", "update:todos", "read:todos"]
}
getOrganization
Link to this section
Get details for the organization your user is signed in to.

Usage:

Copy to clipboardkinde.getOrganization();
Sample output:

Copy to clipboard{
    orgCode: "org_1234";
}
getToken
Link to this section
Returns the raw Access token from memory.

Usage:

Copy to clipboardkinde.getToken();
Sample output:

Copy to clipboardeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
    .eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
    .SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c;
getUser
Link to this section
Returns the profile for the current user.

Usage:

Copy to clipboardkinde.getUser();
Sample output:

Copy to clipboard{
    given_name: "Dave";
    id: "abcdef";
    family_name: "Smith";
    email: "dave@smith.com";
}
getUserOrganizations
Link to this section
Gets an array of all organizations the user has access to.

Usage:

Copy to clipboardkinde.getUserOrganizations();
Sample output:

Copy to clipboard{
    orgCodes: ["org_1234", "org_5678"];
}
handleRedirectCallback
Link to this section
A function to be called after your user is redirected back from Kinde.

login
Link to this section
Constructs redirect URL and sends user to Kinde sign in.

Arguments

Copy to clipboardorg_code?: string
Usage:

Copy to clipboardkinde.login();
Example output:

Copy to clipboardredirect;
logout
Link to this section
Logs the user out of Kinde.

Argument:

Copy to clipboardorg_code?: string
Usage:

Copy to clipboardkinde.logout();
Example output:

Copy to clipboardredirect;
register
Link to this section
Constructs redirect url and sends user to Kinde to sign up.


---
I need assistance getting my vue application configured.  I'm using pinia for global state, and  here is my sample Login.vue

<!-- src/views/Login.vue -->
<template id="Login">
    <div>
        <h1>Login</h1>
        <!-- prevent == prevent browser default behavior -->
        <form @submit.prevent="login">
        <input type="text" v-model="username" placeholder="Username" class="input"/>
        <input type="password" v-model="password" placeholder="Password" class="input" />
        <button class="btn" type="submit">Login</button>
        </form>
    </div>
</template>

<script lang="ts">
import { ref } from 'vue';
import { useMainStore } from '../store';
import { useRouter, useRoute } from 'vue-router';

export default {
    setup() {
        const username = ref('');
        const password = ref('');

        const router = useRouter();
        const route = useRoute();

        const login = () => {

            const mainStore = useMainStore();

            mainStore.user = username.value;

            const redirectPath = route.query.redirect || { name: 'Admin' };
            // could also use router.replace
            router.push(redirectPath);
            // alert(`Username: ${username.value} Password: ${password.value}`);
        };

        return { username, password, login };
    },

};
</script>
----

// src/main.ts

import { createApp, reactive } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'
import router from '@/router'
import AppLink from '@/components/AppLink.vue'

const app = createApp(App);
app.component('AppLink', AppLink);  // globally register
app.use(router);
app.use(createPinia());
app.use(VueCookieNext);

app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});


// An application instance won't render anything until its .mount() method is called
app.mount('#app');

----
// existing src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home.vue';
import { useMainStore } from '@/store';



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

router.beforeEach((to, from) => {
  const mainStore = useMainStore();

  if (to.meta.requiresAuth) {
    console.log('requires auth!');
    const isAuth = mainStore.user ? true : false;

    if (!isAuth) {
      return {
        name: 'Login'
      };
    }
  }
});
export default router

---

🙏🏻 step by step, what do you propose?
