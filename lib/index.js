const Boom = require('boom')
const controller = require('./controller')
const createSAML = require('./saml')

const register = (server, options = {}) => {
  const pluginOptions = {
    ...defaultOptions,
    ...options
  }

  const {
    apiPrefix,
    getSAMLOptions,
    login,
    redirectUrlAfterSuccess,
    redirectUrlAfterFailure
  } = pluginOptions

  const config = {
    pre: [
      {
        assign: 'saml',
        method: async (request, h) => {
          const SAMLOptions = await getSAMLOptions(request)
          if (!SAMLOptions) {
            throw Boom.badImplementation('SAML instance is not configured')
          }
          const saml = createSAML(SAMLOptions)
          if (!saml) {
            throw Boom.badImplementation('SAML configuration is incorrect')
          }

          return saml
        }
      },
      {
        assign: 'login',
        method: () => login
      },
      {
        assign: 'redirectUrlAfterSuccess',
        method: () => redirectUrlAfterSuccess
      },
      {
        assign: 'redirectUrlAfterFailure',
        method: () => redirectUrlAfterFailure
      }
    ]
  }

  server.route({
    method: 'GET',
    path: `${apiPrefix}/metadata`,
    config: { ...config, ...controller.metadata }
  })

  server.route({
    method: 'GET',
    path: `${apiPrefix}/login`,
    config: { ...config, ...controller.login }
  })

  server.route({
    method: 'GET',
    path: `${apiPrefix}/logout`,
    config: { ...config, ...controller.logout }
  })

  server.route({
    method: 'POST',
    path: `${apiPrefix}/callback`,
    config: {
      ...controller.callback,
      pre: [
        ...config.pre,
        ...controller.callback.pre
      ]
    }
  })
}

const defaultOptions = {
  apiPrefix: '/saml',
  getSAMLOptions: (request) => {
    throw new Error(`${exports.plugin.name}: "getOptions" function is required for request ${request.info.id}`)
  },
  login: (request, identifier) => {
    throw new Error(`${exports.plugin.name}: "login" function is required for request ${request.info.id} and identifier ${identifier}`)
  },
  redirectUrlAfterSuccess: '/',
  redirectUrlAfterFailure: '/'
}

exports.plugin = {
  register,
  name: 'hapi-saml2'
}
