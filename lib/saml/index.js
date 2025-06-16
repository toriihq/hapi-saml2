const { SAML } = require('@node-saml/node-saml')

const createSAML = (options = {}) => {
  const instance = new SAML(options)
  instance.options = options
  instance.decryptionCert = options.decryptionCert
  return instance
}

module.exports = createSAML
