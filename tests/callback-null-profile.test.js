const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')

// Mock @node-saml/node-saml to return { profile: null } — this simulates
// NoPassive status responses and LogoutResponse messages, which previously
// crashed the callback handler with "Cannot read properties of null (reading 'nameID')".
jest.mock('@node-saml/node-saml', () => ({
  SAML: jest.fn().mockImplementation(() => ({
    validatePostResponseAsync: jest.fn(async () => ({ profile: null })),
    getAuthorizeUrlAsync: jest.fn(async () => 'http://localhost:3000/entryPoint?SAMLRequest=x'),
    getLogoutUrlAsync: jest.fn(async () => 'http://localhost:3000/entryPoint?SAMLRequest=x')
  }))
}))

describe('Callback with null profile', () => {
  let server
  const loginMock = jest.fn()

  beforeAll(async () => {
    server = Hapi.server({ port: 0, host: 'localhost' })

    await server.register({
      plugin: require('hapi-saml2'),
      options: {
        login: loginMock,
        logout: jest.fn(async () => {}),
        apiPrefix: '/saml-test',
        redirectUrlAfterSuccess: '/success',
        redirectUrlAfterFailure: '/failure',
        boomErrorForMissingConfiguration: Boom.badImplementation('SAML instance is not configured'),
        boomErrorForIncorrectConfiguration: Boom.badImplementation('SAML configuration is incorrect'),
        getSAMLOptions: jest.fn(async () => ({
          callbackUrl: 'http://localhost:3000/callback',
          issuer: 'https://saml.example.com/',
          idpCert: 'unused-due-to-mock',
          entryPoint: 'http://localhost:3000/entryPoint',
          generateUniqueId: () => 'uniqueId'
        }))
      }
    })
    await server.initialize()
  })

  it('should redirect to the failure page without calling login() when profile is null', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/saml-test/callback',
      payload: { SAMLResponse: 'any-value-mocked' }
    })

    expect(response.statusCode).toEqual(302)
    expect(response.headers.location).toEqual('/failure')
    expect(loginMock).not.toHaveBeenCalled()
  })
})
