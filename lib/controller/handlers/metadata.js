module.exports = {
  auth: false,
  handler: async (request, h) => {
    const { saml } = request.pre
    return h
      .response(saml.generateServiceProviderMetadata(saml.decryptionCert))
      .type('application/xml')
  },
  tags: ['api', 'saml'],
  description: 'SAML service provider metadata',
  notes: 'SAML service provider metadata'
}
