# hapi-saml2 Changelog

## Version 5.0.2
- Upgrade to node-saml version 5.0.1
- `cert` is now `idpCert`
- `signingCert` is now `publicCert`

## Version 5.0.1
- Added `preLogin` handler option

## Version 5.0.0
- Do not use this version, it contains a breaking change that was reverted

## Version 4.0.7
- Add support for `authnRequestBinding: 'HTTP-POST'` option

## Version 4.0.6
- Fix the results handling of the login function.

## Version 4.0.5
- Added an option to return a result object from the login function.

## Version 4.0.4
- Added "postResponseValidationErrorHandler" option

## Version 4.0.3
- Use "@node-saml/node-saml" instead of "passport-saml"
