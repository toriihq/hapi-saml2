module.exports = {
  auth: false,
  handler: async (request, h) => {
    const { saml } = request.pre
    if (saml.options.authnRequestBinding === 'HTTP-POST') {
      const HTMLWithPOSTRequest = await saml.getAuthorizeFormAsync()
      return HTMLWithPOSTRequest
    } else {
      const loginUrl = await saml.getAuthorizeUrlAsync()
      return h.redirect(loginUrl)
    }
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider login',
  notes: 'SAML service provider login'
}
