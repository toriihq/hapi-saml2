# hapi-saml2

> hapi-saml2 is a [hapi.js](https://hapijs.com/) plugin, it uses [node-saml](https://github.com/node-saml/node-saml) library to provide Single Sign On using SAML protocol


## Notes

This plugin based on [node-saml](https://github.com/node-saml/node-saml) and was originally inspired by [hapi-saml-sso](https://www.npmjs.com/package/hapi-saml-sso).

Check the documentation of the repository for `options` documentation

## Versions

### node-saml version

| hapi-saml2 version | dependency version         |
|--------------------|----------------------------|
| 5.0.0              | @node-saml/node-saml@4.0.5 |
| 4.0.5 - 4.0.7      | @node-saml/node-saml@4.0.5 |
| 4.0.3 - 4.0.4      | @node-saml/node-saml@4.0.3 |
| 3.2.2 - 3.2.2      | passport-saml@3.2.1        |
| 3.2.0 - 3.2.1      | passport-saml@3.2.0        |
| 2.2.0 - 2.2.0      | passport-saml@2.2.0        |
| 2.0.2 - 2.0.3      | passport-saml@2.0.2        |
| 1.3.5 - 1.3.8      | passport-saml@1.3.5        |

### @hapi/hapi supported versions

| hapi-saml2 version | hapi.js supported version |
|----|---------------------------|
| 1.0.0 - latest | v18 - v21                 |
| 0.0.1 - 0.0.5 | v17                       |

## Usage

Add `hapi-saml2` to your project:

```
npm install hapi-saml2 --save
```

Register the plugin and configure it with the options:

```javascript
const Hapi = require('@hapi/hapi')
const server = Hapi.server({
  port: 3000,
  host: 'localhost'
})

const init = async () => {
  await server.register({
    plugin: require('hapi-saml2'),
    options: {
      getSAMLOptions: (request) => {}, // required. should return options for `node-saml`
      login: async (request, identifier, user) => {}, // required. should return true if user is authenticated and authenticate user based on identifier (Profile.nameID is used), 
      // or return an object { success: Boolean, errorMessage: String } to sent an error message to postResponseValidationErrorHandler(if implemented)
      logout: async (request) => {}, // required. should logout the user on the app
      apiPrefix: '/saml', // prefix for added routes
      redirectUrlAfterSuccess: '/', // url to redirect to after successful login
      redirectUrlAfterFailure: '/', // url to redirect to after failed login
      boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'), // Boom error to throw on missing configuration error
      boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect'), // Boom error to throw on incorrect configuration error
      postResponseValidationErrorHandler: async ({ request, h, e }) => { return h.redirect('/errorPage') } // function to handle Post Response validation errors
    }
  })

  await server.start()
}

init()
```

The plugin provides the following SSO API:
```
GET  /saml/metadata.xml
GET  /saml/login
GET  /saml/logout
POST /saml/callback
```

They can be configured with `apiPrefix` option.

## Testing

First, install the following dev-dependencies:
```
yarn add -D @hapi/hapi
yarn add -D @hapi/boom
```

Then run `yarn test`. 
