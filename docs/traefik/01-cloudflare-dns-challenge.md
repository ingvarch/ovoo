# Traefik + Cloudflare DNS Challenge

This guide explains how to configure Traefik with Cloudflare DNS Challenge for automatic SSL certificates. This is the recommended approach when using Cloudflare proxy (orange cloud).

## Why DNS Challenge?

When using Cloudflare proxy, HTTP Challenge fails because:
1. Cloudflare intercepts traffic on ports 80/443
2. Let's Encrypt cannot reach your server directly for HTTP-01 validation

DNS Challenge solves this by:
1. Traefik creates a DNS TXT record via Cloudflare API
2. Let's Encrypt verifies domain ownership via DNS
3. Works with Cloudflare proxy enabled
4. Supports wildcard certificates (`*.example.com`)

## Prerequisites

- Traefik installed (see [00-basic-setup.md](./00-basic-setup.md))
- Domain managed by Cloudflare
- Cloudflare account

## Step 1: Create Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your profile icon (top right) → **My Profile**
3. Select **API Tokens** in the left sidebar
4. Click **Create Token**
5. Use the **Edit zone DNS** template, or create custom token with:

```
Permissions:
  - Zone → DNS → Edit
  - Zone → Zone → Read

Zone Resources:
  - Include → Specific zone → your-domain.com
  (or "All zones" if you have multiple domains)
```

6. Click **Continue to summary** → **Create Token**
7. **Copy the token immediately** (you won't see it again!)

## Step 2: Store API Token Securely

Create a file for the Cloudflare credentials:

```bash
sudo nano /etc/traefik/cloudflare.env
```

Add your token (use the same token for both if it has DNS Edit + Zone Read permissions):

```bash
CLOUDFLARE_DNS_API_TOKEN=your-cloudflare-api-token-here
CLOUDFLARE_ZONE_API_TOKEN=your-cloudflare-api-token-here
```

Secure the file:

```bash
sudo chmod 600 /etc/traefik/cloudflare.env
sudo chown traefik:traefik /etc/traefik/cloudflare.env
```

## Step 3: Update Traefik Configuration

Edit `/etc/traefik/traefik.yml`:

```yaml
# /etc/traefik/traefik.yml

api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

# Certificate resolver with DNS Challenge
certificatesResolvers:
  letsencrypt:
    acme:
      email: "your-email@example.com"  # Change this!
      storage: "/var/lib/traefik/acme.json"
      dnsChallenge:
        provider: cloudflare
        # Use Cloudflare and Google DNS for faster propagation checks
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
        # Optional: wait before checking DNS propagation (default 0s)
        propagation:
          delayBeforeChecks: 10s

providers:
  nomad:
    endpoint:
      address: "http://127.0.0.1:4646"
      token: "your-nomad-token"  # If ACL enabled
    prefix: traefik
    exposedByDefault: false

  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

log:
  level: INFO
```

## Step 4: Update Systemd Service

Edit `/etc/systemd/system/traefik.service`:

```ini
[Unit]
Description=Traefik Reverse Proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=traefik
Group=traefik
# Load Cloudflare API token from file
EnvironmentFile=/etc/traefik/cloudflare.env
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yml
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/traefik

# Allow binding to privileged ports
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

## Step 5: Restart Traefik

```bash
# Reload systemd
sudo systemctl daemon-reload

# Restart Traefik
sudo systemctl restart traefik

# Check logs
sudo journalctl -u traefik -f
```

You should see:
```
INF Starting provider *acme.Provider
INF Testing certificate renew...
```

## Step 6: Test Certificate Issuance

Deploy a test service in Nomad with Traefik tags (via ovoo):

1. Create a new Job (e.g., nginx)
2. Enable **Network** with port `http` → `80`
3. Enable **Service Discovery & Ingress**
4. Set domain: `test.your-domain.com`
5. Enable HTTPS
6. Deploy

Check Traefik logs:

```bash
sudo journalctl -u traefik -f | grep -i acme
```

You should see:
```
INF Domains [test.your-domain.com] need ACME certificates...
INF legolog: [INFO] [test.your-domain.com] acme: Obtaining bundled SAN certificate
INF legolog: [INFO] [test.your-domain.com] AuthURL: https://acme-v02.api.letsencrypt.org/acme/authz/...
INF legolog: [INFO] [test.your-domain.com] acme: Trying to solve DNS-01
INF legolog: [INFO] [test.your-domain.com] acme: Checking DNS record propagation...
INF legolog: [INFO] [test.your-domain.com] The server validated our request
INF legolog: [INFO] [test.your-domain.com] acme: Validations succeeded; requesting certificates
INF Certificate obtained successfully...
```

## Wildcard Certificates (Optional)

With DNS Challenge, you can use wildcard certificates:

Edit `/etc/traefik/dynamic.yml`:

```yaml
http:
  routers:
    wildcard-router:
      rule: "HostRegexp(`^[a-z]+\\.your-domain\\.com$`)"
      service: your-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
        domains:
          - main: "your-domain.com"
            sans:
              - "*.your-domain.com"
```

## Troubleshooting

### Error: Invalid credentials

```
Unable to obtain ACME certificate... error code: 9109
```

**Solution**: Check your API token has the correct permissions (Zone:DNS:Edit, Zone:Zone:Read).

### Error: DNS propagation timeout

```
acme: error presenting token: cloudflare: failed to find zone
```

**Solution**:
1. Verify Zone Resources in your API token include your domain
2. Try increasing `propagation.delayBeforeChecks` in traefik.yml

### Check DNS TXT records

During certificate issuance, Traefik creates temporary TXT records:

```bash
dig TXT _acme-challenge.test.your-domain.com
```

### View current certificates

```bash
sudo cat /var/lib/traefik/acme.json | jq '.letsencrypt.Certificates[].domain'
```

### Force certificate renewal

```bash
# Remove stored certificates (use with caution!)
sudo systemctl stop traefik
sudo rm /var/lib/traefik/acme.json
sudo systemctl start traefik
```

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_DNS_API_TOKEN` | API Token with DNS Edit permission (recommended) |
| `CLOUDFLARE_ZONE_API_TOKEN` | API Token with Zone Read permission (can be same as DNS token) |
| `CLOUDFLARE_EMAIL` | Cloudflare account email (legacy, use with API_KEY) |
| `CLOUDFLARE_API_KEY` | Cloudflare Global API Key (legacy, less secure) |

## Summary

With DNS Challenge configured:
1. Cloudflare proxy can stay enabled (orange cloud)
2. Certificates are issued automatically for any domain
3. Wildcard certificates are supported
4. No need for port 80 to be publicly accessible for challenge

All Nomad services with `traefik.http.routers.*.tls.certresolver=letsencrypt` tags will automatically get SSL certificates.
