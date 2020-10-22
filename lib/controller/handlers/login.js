const { promisify } = require('util')

module.exports = {
  auth: false,
  handler: async (request, h) => {
    const { saml } = request.pre
    const req = {
      headers: request.headers,
      body: request.payload,
      query: request.query
    }
    const additionalOptions = {}
    const loginUrl = await promisify(saml.getAuthorizeUrl).bind(saml)(req, additionalOptions)

    return h.redirect(loginUrl)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider login',
  notes: 'SAML service provider login'
}
