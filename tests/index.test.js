const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const fs = require('fs')
const path = require('path')

describe('Hapi Plugin', () => {
  let server
  beforeAll(async () => {
    server = Hapi.server({ port: 0, host: 'localhost' })

    await server.register({
      plugin: require('hapi-saml2'),
      options: {
        getSAMLOptions: jest.fn(async (request) => ({
          cert: 'test-cert',
          entryPoint: 'http://localhost:3000/entryPoint'
        })),
        login: jest.fn(async (request, identifier, user) => {}),
        logout: jest.fn(async (request) => {}),
        apiPrefix: '/saml-test',
        redirectUrlAfterSuccess: '/success',
        redirectUrlAfterFailure: '/failure',
        boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'),
        boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect')
      }
    })

    await server.initialize()
  })

  describe('/saml-test/metadata', () => {
    it('should get a valid metadata', async () => {
      const request = {
        method: 'GET',
        url: '/saml-test/metadata'
      }
      const expectedResult = fs.readFileSync(path.join(__dirname, './fixtures/expected/sp_metadata.xml')).toString()

      const response = await server.inject(request)

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
      const response = await server.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toContain('http://localhost:3000/entryPoint?SAMLRequest=')
    })
  })

  describe('/saml-test/logout', () => {
    it('should redirect to the correct location', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameId=${encodeURIComponent('test@example.com')}&nameIdFormat=${encodeURIComponent('test-nameIdFormat')}`
      }
      const response = await server.inject(request)

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toContain('http://localhost:3000/entryPoint?SAMLRequest=')
    })

    it('should return error when missing nameIdFormat', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameId=${encodeURIComponent('test@example.com')}`
      }
      const response = await server.inject(request)

      expect(response.statusCode).toEqual(400)
      expect(response.result.message).toEqual('Missing required "nameIdFormat" query parameter')
    })

    it('should return error when missing nameId', async () => {
      const request = {
        method: 'GET',
        url: `/saml-test/logout?nameIdFormat=${encodeURIComponent('test-nameIdFormat')}`
      }
      const response = await server.inject(request)

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
      const response = await server.inject(request)

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
      const response = await server.inject(request)

      expect(response.statusCode).toEqual(406)
      expect(response.result.message).toEqual('SAMLRequest not supported')
    })
  })
})
