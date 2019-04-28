# hapi-saml2

> hapi-saml2 is a [hapi.js](https://hapijs.com/) plugin, it uses [passport-saml](https://github.com/bergie/passport-saml) library to provide Single Sign On using SAML protocol


## Notes

This plugin based on [passport-saml](https://github.com/bergie/passport-saml) and is a fork of [hapi-saml-sso](https://www.npmjs.com/package/hapi-saml-sso).

Check the documentation of the repository for `options` documentation

## Versions

Hapi v18 support: use version from 1.0.0

Hapi v17 support: use versions up to 0.0.4


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
      login: async (request, identifier) => {}, // required. should return true if user is authenticated and authenticate user based on identifier (Profile.nameID is used)
      logout: async (request) => {}, // required. should logout the user on the app
      apiPrefix: '/saml', // prefix for added routes
      redirectUrlAfterSuccess: '/', // url to redirect to after successful login
      redirectUrlAfterFailure: '/' // url to redirect to after failed login
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
