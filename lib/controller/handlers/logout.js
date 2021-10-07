const Boom = require('@hapi/boom')

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

    const user = {
      nameIdFormat,
      nameId
    }
    const logoutUrl = await saml.getLogoutUrlAsync(user)

    await logout()

    return h.redirect(logoutUrl)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider logout',
  notes: 'SAML service provider logout'
}
