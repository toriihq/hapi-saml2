const Boom = require('@hapi/boom')

module.exports = {
  auth: false,
  plugins: {
    crumb: false
  },
  pre: [
    {
      method: async (request, h) => {
        const { saml, postResponseValidationErrorHandler } = request.pre
        const { SAMLRequest, SAMLResponse } = request.payload || {}
        if (SAMLRequest) {
          return Boom.notAcceptable('SAMLRequest not supported')
        }

        if (!SAMLResponse) {
          return Boom.notAcceptable('Invalid SAML format')
        }

        try {
          const { profile } = await saml.validatePostResponseAsync({ SAMLResponse }) || {}
          return profile
        } catch (e) {
          if (!postResponseValidationErrorHandler) {
            throw e
          }

          const errorResponse = await postResponseValidationErrorHandler({ request, h, e })
          if (Boom.isBoom(errorResponse)) {
            return errorResponse
          }
          return h.response(errorResponse).takeover()
        }
      },
      assign: 'user'
    },
    {
      method: async (request, h) => {
        const {
          pre: {
            user,
            login
          }
        } = request

        return Boolean(await login(request, user.nameID, user))
      },
      assign: 'isLoginSuccessful'
    }
  ],
  handler: async (request, h) => {
    const { isLoginSuccessful, redirectUrlAfterSuccess, redirectUrlAfterFailure } = request.pre
    const { RelayState } = request.payload || {}
    const redirectUrlAfterSuccessFinal = RelayState || redirectUrlAfterSuccess
    const url = isLoginSuccessful ? redirectUrlAfterSuccessFinal : redirectUrlAfterFailure
    return h.redirect(url)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider callback',
  notes: 'SAML service provider callback'
}
