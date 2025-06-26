const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const fs = require('node:fs')
const path = require('node:path')
const { IDP_CERT, createValidSAMLResponse } = require('./fixtures/saml-helper')

const loginMockFn = jest.fn()
  .mockReturnValueOnce({ success: true })
  .mockReturnValueOnce('success')
  .mockReturnValueOnce(null)
  .mockReturnValueOnce({ success: false, errorMessage: 'test-error-message' })
  .mockReturnValueOnce({ success: false })
  .mockReturnValueOnce({ loginResult: 'loginResult' })
  .mockReturnValueOnce(false)

describe('Hapi Plugin', () => {
  let serverForRedirect
  let serverForPOST
  let serverWithPreLoginContinue
  let serverWithPreLoginRedirect

  beforeAll(async () => {
    serverForRedirect = Hapi.server({ port: 0, host: 'localhost' })
    serverForPOST = Hapi.server({ port: 0, host: 'localhost' })
    serverWithPreLoginContinue = Hapi.server({ port: 0, host: 'localhost' })
    serverWithPreLoginRedirect = Hapi.server({ port: 0, host: 'localhost' })

    const sharedOptions = {
      login: loginMockFn,
      logout: jest.fn(async (request) => {}),
      apiPrefix: '/saml-test',
      redirectUrlAfterSuccess: '/success',
      redirectUrlAfterFailure: '/failure',
      boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'),
      boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect'),
      postResponseValidationErrorHandler: jest.fn(({ h, e }) => {
        return h.redirect(`https://www.example.com/?error=${encodeURIComponent(e.message)}`)
      })
    }
    const sharedSAMLOptions = {
      callbackUrl: 'http://localhost:3000/callback',
      issuer: 'https://saml.example.com/',
      idpCert: IDP_CERT,
      entryPoint: 'http://localhost:3000/entryPoint',
      generateUniqueId: () => 'uniqueId',
      wantAssertionsSigned: false,
      wantAuthnResponseSigned: true
    }
    await serverForRedirect.register({
      plugin: require('hapi-saml2'),
      options: {
        ...sharedOptions,
        getSAMLOptions: jest.fn(async (request) => (sharedSAMLOptions))
      }
    })
    await serverForRedirect.initialize()

    await serverForPOST.register({
      plugin: require('hapi-saml2'),
      options: {
        ...sharedOptions,
        getSAMLOptions: jest.fn(async (request) => ({
          ...sharedSAMLOptions,
          authnRequestBinding: 'HTTP-POST'
        }))
      }
    })
    await serverForPOST.initialize()

    await serverWithPreLoginContinue.register({
      plugin: require('hapi-saml2'),
      options: {
        ...sharedOptions,
        getSAMLOptions: jest.fn(async (request) => (sharedSAMLOptions)),
        preLogin: (request, h) => h.continue
      }
    })
    await serverWithPreLoginContinue.initialize()

    await serverWithPreLoginRedirect.register({
      plugin: require('hapi-saml2'),
      options: {
        ...sharedOptions,
        getSAMLOptions: jest.fn(async (request) => (sharedSAMLOptions)),
        preLogin: (request, h) => {
          return h.redirect('/custom-redirect').takeover()
        }
      }
    })
    await serverWithPreLoginRedirect.initialize()
  })

  describe('/saml-test/metadata', () => {
    it('should get a valid metadata', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/metadata'
      }
      const expectedResult = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="https://saml.example.com/" ID="uniqueId">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" AuthnRequestsSigned="false">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService index="1" isDefault="true" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:3000/callback"/>
  </SPSSODescriptor>
</EntityDescriptor>`

      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(200)
      expect(response.result).toEqual(expectedResult)
    })
  })

  describe('/saml-test/login', () => {
    it('should redirect to the correct location', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/login'
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toContain('http://localhost:3000/entryPoint?SAMLRequest=')
    })

    it('should return HTTP to the correct location', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/login'
      }
      const response = await serverForPOST.inject(request)

      expect(response.statusCode).toEqual(200)
      expect(response.result).toContain('<input type="hidden" name="SAMLRequest" value="')
    })
  })

  describe('preLogin function', () => {
    it('should continue to SAML login when preLogin returns h.continue', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/login'
      }
      const response = await serverWithPreLoginContinue.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toContain('http://localhost:3000/entryPoint?SAMLRequest=')
    })

    it('should redirect to custom URL when preLogin returns h.redirect', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/login'
      }
      const response = await serverWithPreLoginRedirect.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toEqual('/custom-redirect')
    })
  })

  describe('/saml-test/logout', () => {
    it('should redirect to the correct location', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameId=${encodeURIComponent('test@example.com')}&nameIdFormat=${encodeURIComponent('test-nameIdFormat')}`
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toContain('http://localhost:3000/entryPoint?SAMLRequest=')
    })

    it('should return error when missing nameIdFormat', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameId=${encodeURIComponent('test@example.com')}`
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(400)
      expect(response.result.message).toEqual('Missing required "nameIdFormat" query parameter')
    })

    it('should return error when missing nameId', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameIdFormat=${encodeURIComponent('test-nameIdFormat')}`
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(400)
      expect(response.result.message).toEqual('Missing required "nameId" query parameter')
    })
  })

  describe('/saml-test/callback', () => {
    it('should return error when missing SAMLResponse in payload', async () => {
      const request = {
        method: 'POST',
        url: '/saml-test/callback'
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(406)
      expect(response.result.message).toEqual('Invalid SAML format')
    })

    it('should return error when SAMLRequest in present in payload', async () => {
      const request = {
        method: 'POST',
        url: '/saml-test/callback',
        payload: {
          SAMLRequest: 'test-SAMLRequest'
        }
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(406)
      expect(response.result.message).toEqual('SAMLRequest not supported')
    })

    it('should return error when SAMLResponse is invalid', async () => {
      const request = {
        method: 'POST',
        url: '/saml-test/callback',
        payload: {
          SAMLResponse: 'test-SAMLResponse-invalid'
        }
      }
      const response = await serverForRedirect.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toEqual('https://www.example.com/?error=Not%20a%20valid%20XML%20document')
    })

    describe('Handling result from the login function', () => {
      it('should redirect to success page if login() return { success: true }', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to success page if login() return string', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to the default failure page if login() return null', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })

      it('should redirect to failure page with message if login() return { success: false, errorMessage: String }', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('https://www.example.com/?error=test-error-message')
      })

      it('should redirect to the default failure page if login() return { success: false }', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })

      it('should redirect to the success page if login() return an object without success = false', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to the failure page if login() === false', async () => {
        const validSAMLResponse = createValidSAMLResponse()
        const request = {
          method: 'POST',
          url: '/saml-test/callback',
          payload: {
            SAMLResponse: validSAMLResponse
          }
        }
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })
    })
  })
})
