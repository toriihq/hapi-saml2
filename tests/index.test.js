const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const fs = require('fs')
const path = require('path')
const { SAML } = require('@node-saml/node-saml')

jest.mock('@node-saml/node-saml', () => {
  return {
    ...jest.requireActual('@node-saml/node-saml')
  }
})

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

  beforeAll(async () => {
    serverForRedirect = Hapi.server({ port: 0, host: 'localhost' })
    serverForPOST = Hapi.server({ port: 0, host: 'localhost' })

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
      issuer: 'https://saml.example.com/',
      cert: 'test-cert',
      entryPoint: 'http://localhost:3000/entryPoint',
      generateUniqueId: () => 'uniqueId'
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
  })

  describe('/saml-test/metadata', () => {
    it('should get a valid metadata', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/metadata'
      }
      const expectedResult = fs.readFileSync(path.join(__dirname, './fixtures/expected/sp_metadata.xml')).toString().trim()

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
      expect(response.result).toContain(`<input type="hidden" name="SAMLRequest" value="`)
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
      const request = {
        method: 'POST',
        url: '/saml-test/callback',
        payload: {
          SAMLResponse: 'test'
        }
      }

      beforeAll(() => {
        SAML.prototype.validatePostResponseAsync = jest.fn().mockResolvedValue(Promise.resolve({ profile: 'test' }))
      })

      it('should redirect to success page if login() return { success: true }', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to success page if login() return string', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to the default failure page if login() return null', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })

      it('should redirect to failure page with message if login() return { success: false, errorMessage: String }', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('https://www.example.com/?error=test-error-message')
      })

      it('should redirect to the default failure page if login() return { success: false }', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })

      it('should redirect to the success page if login() return an object without success = false', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/success')
      })

      it('should redirect to the failure page if login() === false', async () => {
        const response = await serverForRedirect.inject(request)
        expect(response.headers.location).toEqual('/failure')
      })
    })
  })
})
