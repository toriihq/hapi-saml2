const { promisify } = require('util')

module.exports = {
  auth: false,
  handler: async (request, h) => {
    const { saml } = request.pre
    const loginUrl = await promisify(saml.getAuthorizeUrl).bind(saml)({
      headers: request.headers,
      body: request.payload,
      query: request.query
    })

    return h.redirect(loginUrl)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider login',
  notes: 'SAML service provider login'
}
