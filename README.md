# hapi-saml2

> hapi-saml2 is a [hapi.js](https://hapijs.com/) plugin, it uses [passport-saml](https://github.com/bergie/passport-saml) library to provide Single Sign On using SAML protocol


## Notes

This plugin based on [passport-saml](https://github.com/bergie/passport-saml) and is a fork of [hapi-saml-sso](https://www.npmjs.com/package/hapi-saml-sso).

Check the documentation of the repository for `options` documentation

## Versions

Version 1.3.5 - 1.3.8 uses `passport-saml@1.3.5`.

Hapi v18 support: use version from 1.0.0

Hapi v17 support: use versions up to 0.0.5


## Usage

Add `hapi-saml2` to your project:

```
npm install hapi-saml2 --save
```

Register the plugin and configure it with the options:

```javascript
const Hapi = require('hapi')
const server = Hapi.server({
  port: 3000,
  host: 'localhost'
})

const init = async () => {
  await server.register({
    plugin: require('hapi-saml2'),
    options: {
      getSAMLOptions: (request) => {}, // required. should return options for `passport-saml`
      login: async (request, identifier, user) => {}, // required. should return true if user is authenticated and authenticate user based on identifier (Profile.nameID is used)
      logout: async (request) => {}, // required. should logout the user on the app
      apiPrefix: '/saml', // prefix for added routes
      redirectUrlAfterSuccess: '/', // url to redirect to after successful login
      redirectUrlAfterFailure: '/', // url to redirect to after failed login
      boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'), // Boom error to throw on missing configuration error
      boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect') // Boom error to throw on incorrect configuration error
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
