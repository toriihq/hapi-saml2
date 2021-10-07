const createSAML = require('../../lib/saml')

describe('createSAML', () => {
  it('should create a SAML instance with all expected functions', () => {
    const saml = createSAML({
      cert: 'test-cert'
    })
    expect(saml.validatePostResponseAsync).toBeInstanceOf(Function)
    expect(saml.generateServiceProviderMetadata).toBeInstanceOf(Function)
    expect(saml.getLogoutUrlAsync).toBeInstanceOf(Function)
    expect(saml.getAuthorizeUrlAsync).toBeInstanceOf(Function)
  })

  it('should create a SAML instance with a decryptionCert', () => {
    const saml = createSAML({
      cert: 'test-cert',
      decryptionCert: 'test-decryption-cert'
    })
    expect(saml.decryptionCert).toEqual('test-decryption-cert')
  })
})
