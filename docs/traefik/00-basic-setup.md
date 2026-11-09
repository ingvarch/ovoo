# Traefik Setup Guide for Nomad

This guide explains how to set up Traefik as a reverse proxy for your Nomad cluster, enabling automatic routing and SSL certificates for your applications.

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Traefik (systemd service) :80/:443             │
│                                                 │
│  Static routes:                                 │
│  - nomad.example.com → Nomad API (:4646)        │
│                                                 │
│  Dynamic routes (Nomad Service Discovery):      │
│  - app1.example.com → Nomad job "app1"          │
│  - app2.example.com → Nomad job "app2"          │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Nomad Server (:4646)                           │
│  - Manages jobs                                 │
│  - Registers services with tags                 │
└─────────────────────────────────────────────────┘
```

## Prerequisites

- Ubuntu/Debian server with Nomad installed
- Domain pointing to your server (e.g., `nomad.example.com`)
- Ports 80 and 443 available (stop nginx if running)

## Installation

### 1. Install Traefik

Avoid Traefik v3.6.4 to v3.6.6: they reject the encoded slashes in ovoo's
periodic job pages, see [Behind a reverse proxy](../deployment.md#behind-a-reverse-proxy).

```bash
# Download the Traefik binary
export TRAEFIK_VERSION="v3.7.17"
wget https://github.com/traefik/traefik/releases/download/${TRAEFIK_VERSION}/traefik_${TRAEFIK_VERSION}_linux_amd64.tar.gz
tar -xzf traefik_${TRAEFIK_VERSION}_linux_amd64.tar.gz
sudo mv traefik /usr/local/bin/
sudo chmod +x /usr/local/bin/traefik

# Create traefik user
sudo useradd -r -s /bin/false traefik

# Create directories
sudo mkdir -p /etc/traefik
sudo mkdir -p /var/lib/traefik
sudo chown traefik:traefik /var/lib/traefik
```

### 2. Create Traefik Configuration

Create `/etc/traefik/traefik.yml`:

```yaml
# /etc/traefik/traefik.yml

# API and Dashboard
api:
  dashboard: true
  insecure: false  # Dashboard only via authenticated route

# Entry Points
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

# Let's Encrypt Certificate Resolver
certificatesResolvers:
  letsencrypt:
    acme:
      email: "admin@example.com"  # Change this!
      storage: "/var/lib/traefik/acme.json"
      httpChallenge:
        entryPoint: web

# Providers
providers:
  # Nomad Service Discovery for dynamic routing
  nomad:
    endpoint:
      address: "http://127.0.0.1:4646"
      # token: "your-nomad-token"  # Uncomment if ACL is enabled
    prefix: traefik
    exposedByDefault: false

  # File provider for static routes (Nomad API, Dashboard)
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

# Logging
log:
  level: INFO
```

### 3. Create Dynamic Configuration

Create `/etc/traefik/dynamic.yml`:

```yaml
# /etc/traefik/dynamic.yml

http:
  routers:
    # Nomad API access (for ovoo)
    nomad-api:
      rule: "Host(`nomad.example.com`)"  # Change this!
      service: nomad-api
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    # Traefik Dashboard (optional)
    traefik-dashboard:
      rule: "Host(`traefik.example.com`)"  # Change this!
      service: api@internal
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - dashboard-auth

  services:
    nomad-api:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:4646"

  middlewares:
    # Basic auth for dashboard (generate with: htpasswd -nb admin password)
    dashboard-auth:
      basicAuth:
        users:
          - "admin:$apr1$xyz..."  # Generate your own!
```

### 4. Create Systemd Service

Create `/etc/systemd/system/traefik.service`:

```ini
[Unit]
Description=Traefik Reverse Proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=traefik
Group=traefik
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

### 5. Start Traefik

```bash
# Stop nginx if running
sudo systemctl stop nginx
sudo systemctl disable nginx

# Enable and start Traefik
sudo systemctl daemon-reload
sudo systemctl enable traefik
sudo systemctl start traefik

# Check status
sudo systemctl status traefik

# View logs
sudo journalctl -u traefik -f
```

## Nomad ACL Configuration

If your Nomad cluster has ACL enabled, Traefik needs a token to access the Nomad API for service discovery.

### 1. Create ACL Policy

```bash
# Create policy file
cat > /tmp/traefik-policy.hcl << 'EOF'
namespace "*" {
  policy = "read"
}

node {
  policy = "read"
}

agent {
  policy = "read"
}
EOF

# Apply the policy
nomad acl policy apply -description "Traefik service discovery" traefik-policy /tmp/traefik-policy.hcl
```

### 2. Create ACL Token

```bash
nomad acl token create -name "traefik" -policy "traefik-policy" -type "client"
```

Copy the `Secret ID` from the output.

### 3. Add Token to Traefik Configuration

Edit `/etc/traefik/traefik.yml` and add the token:

```yaml
providers:
  nomad:
    endpoint:
      address: "http://127.0.0.1:4646"
      token: "YOUR-SECRET-ID-HERE"  # Add your token here
    prefix: traefik
    exposedByDefault: false
```

### 4. Restart Traefik

```bash
sudo systemctl restart traefik

# Verify no more 403 errors
sudo journalctl -u traefik -f
```

## Configuration for Cloudflare

If you're using Cloudflare as a DNS proxy (orange cloud), the HTTP Challenge for Let's Encrypt will fail because Cloudflare intercepts traffic.

**Recommended: Use DNS Challenge with Cloudflare API**

See [01-cloudflare-dns-challenge.md](./01-cloudflare-dns-challenge.md) for detailed setup instructions.

This allows:
- Cloudflare proxy to stay enabled
- Automatic certificate issuance for any domain
- Wildcard certificate support (`*.example.com`)

## Using Ingress in ovoo

Once Traefik is running, you can expose your Nomad jobs through it using the Service Discovery & Ingress feature in ovoo:

1. Create or edit a job in ovoo
2. In the task group, enable "Service Discovery & Ingress"
3. Enter your domain (e.g., `myapp.example.com`)
4. Enable HTTPS if using Let's Encrypt or Cloudflare Origin Certificate
5. Deploy the job

ovoo will generate the appropriate Traefik tags:

```
traefik.enable=true
traefik.http.routers.myapp.rule=Host(`myapp.example.com`)
traefik.http.routers.myapp.entrypoints=websecure
traefik.http.routers.myapp.tls.certresolver=letsencrypt
```

Traefik will automatically detect the new service and create the route.

## Troubleshooting

### Check Traefik logs
```bash
sudo journalctl -u traefik -f
```

### Verify Nomad services are visible
```bash
curl http://127.0.0.1:4646/v1/services
```

### Check Traefik dashboard
If configured, visit `https://traefik.example.com` to see all routers and services.

### Certificate issues
```bash
# Check ACME storage
sudo cat /var/lib/traefik/acme.json | jq .
```

### Port conflicts
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443
```

## Security Considerations

1. **Nomad ACL**: If ACL is enabled, create a dedicated token for Traefik (see [Nomad ACL Configuration](#nomad-acl-configuration))
2. **Dashboard Access**: Always protect the Traefik dashboard with authentication
3. **Firewall**: Consider restricting port 4646 to localhost only
4. **Cloudflare**: Use "Full (strict)" SSL mode for end-to-end encryption
