const Boom = require('@hapi/boom')
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
    logout,
    redirectUrlAfterSuccess,
    redirectUrlAfterFailure,
    boomErrorForMissingConfiguration,
    boomErrorForIncorrectConfiguration,
    postResponseValidationErrorHandler
  } = pluginOptions

  const config = {
    pre: [
      {
        assign: 'saml',
        method: async (request, h) => {
          const { SAMLOptions, redirectUrl } = (await getSAMLOptions(request)) ?? {}
          if (redirectUrl) {
            return h.redirect(redirectUrl).takeover()
          } 
          if (!SAMLOptions) {
            throw boomErrorForMissingConfiguration
          }

          const saml = createSAML(SAMLOptions)
          if (!saml) {
            throw boomErrorForIncorrectConfiguration
          }

          return saml
        }
      },
      {
        assign: 'login',
        method: () => login
      },
      {
        assign: 'logout',
        method: () => logout
      },
      {
        assign: 'redirectUrlAfterSuccess',
        method: () => redirectUrlAfterSuccess
      },
      {
        assign: 'redirectUrlAfterFailure',
        method: () => redirectUrlAfterFailure
      },
      {
        assign: 'postResponseValidationErrorHandler',
        method: () => postResponseValidationErrorHandler
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
  logout: (request) => {
    throw new Error(`${exports.plugin.name}: "logout" function is required for request ${request.info.id}`)
  },
  redirectUrlAfterSuccess: '/',
  redirectUrlAfterFailure: '/',
  boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'),
  boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect'),
  postResponseValidationErrorHandler: null
}

exports.plugin = {
  register,
  name: 'hapi-saml2'
}
