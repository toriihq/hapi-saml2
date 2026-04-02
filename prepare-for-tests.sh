#! /bin/bash

# Exit on error
set -e

# Install peer dependencies needed for tests
npm install --no-save @hapi/hapi @hapi/boom xml-crypto

# Create the certs directory
mkdir -p tests/fixtures/certs

# Generate both private key and certificate in one command
openssl req -x509 -newkey rsa:2048 -keyout tests/fixtures/certs/idp-private-key.pem -out tests/fixtures/certs/idp-cert.pem -days 365 -nodes -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=test.example.com"