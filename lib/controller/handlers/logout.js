const Boom = require('@hapi/boom')
const { promisify } = require('util')

module.exports = {
  auth: false,
  handler: async (request, h) => {
    const { saml, logout } = request.pre
    const { nameIdFormat, nameId } = request.query || {}
    if (!nameIdFormat) {
      return Boom.badRequest('Missing required "nameIdFormat" query parameter')
    }
    if (!nameId) {
      return Boom.badRequest('Missing required "nameId" query parameter')
    }

    const req = {
      user: {
        nameIDFormat,
        nameID
      }
    }
    const additionalOptions = {}
    const logoutUrl = await promisify(saml.getLogoutUrl).bind(saml)(req, additionalOptions)

    await logout()

    return h.redirect(logoutUrl)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider logout',
  notes: 'SAML service provider logout'
}
