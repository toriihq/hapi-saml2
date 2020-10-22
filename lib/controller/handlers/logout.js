const Joi = require('@hapi/joi')
const { promisify } = require('util')

module.exports = {
  auth: false,
  validate: {
    options: { stripUnknown: true },
    query: {
      nameIdFormat: Joi.string().required(),
      nameId: Joi.string().required()
    }
  },
  handler: async (request, h) => {
    const { saml, logout } = request.pre

    const req = {
      user: {
        nameIDFormat: request.query.nameIdFormat,
        nameID: request.query.nameId
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
