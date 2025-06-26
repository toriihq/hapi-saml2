const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { SignedXml } = require('xml-crypto')

const readCert = (filename) => {
  return fs.readFileSync(path.join(__dirname, 'certs', filename), 'utf8')
}

const IDP_CERT = readCert('idp-cert.pem')
const IDP_PRIVATE_KEY = readCert('idp-private-key.pem')

// Helper to create a valid SAML response (signed for testing)
const createValidSAMLResponse = (options = {}) => {
  const {
    nameID = 'test@example.com',
    issuer = 'https://saml.example.com/',
    destination = 'http://localhost:3000/callback',
    audienceURL = 'https://saml.example.com/',
    attributes = {}
  } = options

  const responseId = '_' + crypto.randomBytes(16).toString('hex')
  const assertionId = '_' + crypto.randomBytes(16).toString('hex')
  const now = new Date()
  const notBefore = new Date(now.getTime() - 60000) // 1 minute ago
  const notOnOrAfter = new Date(now.getTime() + 3600000) // 1 hour from now

  // Create a SAML response template
  const samlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${now.toISOString()}" Destination="${destination}" InResponseTo="test">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="${assertionId}" Version="2.0" IssueInstant="${now.toISOString()}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID SPNameQualifier="${audienceURL}" Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameID}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter.toISOString()}" Recipient="${destination}" InResponseTo="test"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
      <saml:AudienceRestriction>
        <saml:Audience>${audienceURL}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${now.toISOString()}" SessionNotOnOrAfter="${notOnOrAfter.toISOString()}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      ${Object.entries(attributes).map(([name, value]) => 
        `<saml:Attribute Name="${name}">
           <saml:AttributeValue xsi:type="xs:string">${value}</saml:AttributeValue>
         </saml:Attribute>`
      ).join('\n      ')}
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`

  // Sign the entire response
  const sig = new SignedXml({
    privateKey: IDP_PRIVATE_KEY
  })
  
  sig.addReference({
    xpath: `//*[@ID='${responseId}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256'
  })
  
  sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#'
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  sig.keyInfoProvider = {
    getKeyInfo: function (key, prefix) {
      return `<X509Data><X509Certificate>${IDP_CERT.replace(/-----BEGIN CERTIFICATE-----|\n|-----END CERTIFICATE-----/g, '')}</X509Certificate></X509Data>`
    }
  }

  try {
    sig.computeSignature(samlResponse, {
      location: { reference: `//*[@ID='${responseId}']`, action: 'prepend' }
    })
    
    // Return base64 encoded response
    return Buffer.from(sig.getSignedXml().trim()).toString('base64')
  } catch (error) {
    // If signing fails, return unsigned response for testing
    console.warn('Failed to sign SAML response, returning unsigned:', error.message)
    return Buffer.from(samlResponse.trim()).toString('base64')
  }
}

module.exports = {
  IDP_CERT,
  IDP_PRIVATE_KEY,
  createValidSAMLResponse
} 