package proxy

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateTestCA(t *testing.T) *tls.Certificate {
	t.Helper()

	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "Test CA"},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		IsCA:         true,
		BasicConstraintsValid: true,
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &priv.PublicKey, priv)
	require.NoError(t, err)

	return &tls.Certificate{
		Certificate: [][]byte{certDER},
		PrivateKey:  priv,
	}
}

func TestGenerateCert_ValidCA(t *testing.T) {
	ca := generateTestCA(t)

	cert, err := GenerateCert(ca, "example.com")
	require.NoError(t, err)
	require.NotNil(t, cert)
	assert.NotEmpty(t, cert.Certificate)
	assert.NotNil(t, cert.PrivateKey)
}

func TestGenerateCert_DNSNames(t *testing.T) {
	ca := generateTestCA(t)

	cert, err := GenerateCert(ca, "test.local")
	require.NoError(t, err)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	assert.Equal(t, []string{"test.local"}, x509Cert.DNSNames)
	assert.Equal(t, "test.local", x509Cert.Subject.CommonName)
}

func TestGenerateCert_KeyUsage(t *testing.T) {
	ca := generateTestCA(t)

	cert, err := GenerateCert(ca, "host.io")
	require.NoError(t, err)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	assert.Equal(t, x509.KeyUsageDigitalSignature, x509Cert.KeyUsage)
	assert.Contains(t, x509Cert.ExtKeyUsage, x509.ExtKeyUsageServerAuth)
}

func TestGenerateCert_SignedByCA(t *testing.T) {
	ca := generateTestCA(t)

	cert, err := GenerateCert(ca, "signed.test")
	require.NoError(t, err)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	caCert, err := x509.ParseCertificate(ca.Certificate[0])
	require.NoError(t, err)

	pool := x509.NewCertPool()
	pool.AddCert(caCert)

	_, err = x509Cert.Verify(x509.VerifyOptions{
		Roots:     pool,
		KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	})
	assert.NoError(t, err, "cert should be verifiable against the CA")
}

func TestGenerateCert_InvalidCA(t *testing.T) {
	badCA := &tls.Certificate{
		Certificate: [][]byte{[]byte("not-a-cert")},
	}

	_, err := GenerateCert(badCA, "host.com")
	assert.Error(t, err)
}

func TestGenerateCert_EmptyHost(t *testing.T) {
	ca := generateTestCA(t)

	cert, err := GenerateCert(ca, "")
	require.NoError(t, err)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	assert.Len(t, x509Cert.DNSNames, 1, "DNSNames should have one entry even for empty host")
	assert.Equal(t, "", x509Cert.DNSNames[0], "DNSNames[0] should be empty string")
	assert.Equal(t, "", x509Cert.Subject.CommonName)
}

func TestGenerateCert_VeryLongHost(t *testing.T) {
	ca := generateTestCA(t)

	longHost := ""
	for i := 0; i < 300; i++ {
		longHost += "a"
	}
	longHost += ".com"

	cert, err := GenerateCert(ca, longHost)
	require.NoError(t, err)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	assert.Equal(t, longHost, x509Cert.Subject.CommonName)
	assert.Contains(t, x509Cert.DNSNames, longHost)
}

func TestGenerateCert_SpecialCharsHost(t *testing.T) {
	ca := generateTestCA(t)

	hosts := []string{
		"host-name.test",
		"host.name.test",
		"127.0.0.1",
		"::1",
		"host with spaces",
	}

	for _, host := range hosts {
		t.Run(host, func(t *testing.T) {
			cert, err := GenerateCert(ca, host)
			require.NoError(t, err)

			x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
			require.NoError(t, err)
			assert.Equal(t, host, x509Cert.Subject.CommonName)
		})
	}
}
