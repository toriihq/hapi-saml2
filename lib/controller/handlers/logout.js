const Joi = require('joi')
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
    const { saml } = request.pre

    const options = {
      user: {
        nameIDFormat: request.query.nameIdFormat,
        nameID: request.query.nameId
      }
    }
    const logoutUrl = await promisify(saml.getLogoutUrl).bind(saml)(options)
    return h.redirect(logoutUrl)
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider logout',
  notes: 'SAML service provider logout'
}
