---
title: "Automating SSH Key Rotation on Hetzner Servers"
date: "03.12.2025"
description: "Security audit said our SSH keys hadn't been rotated in 18 months. Wrote a script to rotate keys across all Hetzner servers and update them in Azure Key Vault. Took 3 hours to build, runs in 5 minutes."
tags: ["SSH", "Security", "Automation", "Hetzner", "Key Rotation"]
readTime: "6 min read"
image: ""
---

# Automating SSH Key Rotation on Hetzner Servers

Security audit said we should rotate SSH keys regularly. Checked when we last rotated keys on our Hetzner servers. Answer: never. The same SSH key has been there for 18 months.

Wrote a script to automate key rotation. Now we can rotate all SSH keys across 8 servers in 5 minutes instead of manually SSH-ing into each one.

## The manual process

Before automation, rotating keys meant:

1. Generate new SSH keypair locally
2. SSH into each server using old key
3. Add new public key to `~/.ssh/authorized_keys`
4. Test that new key works
5. Remove old key from `authorized_keys`
6. Update key in password manager
7. Repeat for all 8 servers

This takes about 2 hours and is error-prone. Easy to lock yourself out if you remove the old key before verifying the new one works.

## The automated script

Created `rotate-ssh-keys.sh`:

```bash
#!/bin/bash
set -e

# List of servers
SERVERS="
server1.example.com
server2.example.com
server3.example.com
"

# Generate new keypair
KEY_NAME="hetzner-$(date +%Y%m%d)"
ssh-keygen -t ed25519 -f "$KEY_NAME" -N "" -C "automated-rotation-$(date +%Y%m%d)"

PUBLIC_KEY=$(cat "${KEY_NAME}.pub")

echo "Generated new key: $KEY_NAME"
echo "Public key: $PUBLIC_KEY"

# Upload new key to Azure Key Vault
az keyvault secret set \
  --vault-name our-vault \
  --name ssh-private-key \
  --file "$KEY_NAME"

az keyvault secret set \
  --vault-name our-vault \
  --name ssh-public-key \
  --value "$PUBLIC_KEY"

# Add new key to all servers
for server in $SERVERS; do
  echo "Adding new key to $server..."

  ssh -i ~/.ssh/old-key root@$server "
    # Backup authorized_keys
    cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup

    # Add new key
    echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys

    # Remove duplicates
    sort -u ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp
    mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys

    chmod 600 ~/.ssh/authorized_keys
  "

  # Test new key
  echo "Testing new key on $server..."
  ssh -i "$KEY_NAME" -o BatchMode=yes root@$server "echo 'New key works'" || {
    echo "ERROR: New key doesn't work on $server!"
    exit 1
  }

  echo "✓ New key verified on $server"
done

# Remove old keys from all servers
echo ""
echo "Removing old keys from all servers..."
for server in $SERVERS; do
  echo "Removing old key from $server..."

  ssh -i "$KEY_NAME" root@$server "
    # Keep only the new key
    echo '$PUBLIC_KEY' > ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
  "

  echo "✓ Old key removed from $server"
done

echo ""
echo "Key rotation complete!"
echo "New private key: $KEY_NAME"
echo "New public key: ${KEY_NAME}.pub"
echo "Keys also stored in Azure Key Vault"
```

Run it:

```bash
./rotate-ssh-keys.sh
```

Output:

```
Generated new key: hetzner-20251203
Public key: ssh-ed25519 AAAAC3...
Adding new key to server1.example.com...
Testing new key on server1.example.com...
✓ New key verified on server1.example.com
Adding new key to server2.example.com...
...
Key rotation complete!
```

Done in 5 minutes.

## Why ed25519 keys

Used `ssh-keygen -t ed25519` instead of RSA.

ed25519 advantages:
- Shorter keys (68 characters vs 500+ for RSA)
- Faster to generate and verify
- More secure per bit than RSA
- Resistant to timing attacks

RSA is still fine, but ed25519 is better for new keys.

## Storing keys in Azure Key Vault

The script uploads keys to Azure Key Vault so they're:
- Encrypted at rest
- Accessible to team members with proper permissions
- Backed up automatically
- Audited (Azure logs who accessed the keys)

To retrieve a key from Key Vault:

```bash
az keyvault secret download \
  --vault-name our-vault \
  --name ssh-private-key \
  --file ~/.ssh/hetzner-key

chmod 600 ~/.ssh/hetzner-key
```

## Testing before removing old keys

The script tests that the new key works before removing the old one. This prevents lockouts.

```bash
ssh -i "$KEY_NAME" -o BatchMode=yes root@$server "echo 'New key works'" || {
  echo "ERROR: New key doesn't work on $server!"
  exit 1
}
```

`-o BatchMode=yes` prevents interactive prompts. If the key doesn't work, SSH fails immediately instead of asking for a password.

If the test fails, the script exits and keeps the old key in place.

## Avoiding lockouts

If something goes wrong during rotation, you can recover:

1. Hetzner provides KVM console access in their web panel
2. Can log in via console and fix `authorized_keys`
3. Also kept backups: `authorized_keys.backup`

Never had to use these, but good to know they exist.

## Key rotation schedule

Security best practice says rotate SSH keys every 90 days. We compromised on every 6 months.

Added to calendar as recurring task. Script makes it painless enough that we actually do it.

## SSH config for multiple keys

After rotation, updated `~/.ssh/config`:

```
Host *.example.com
  User root
  IdentityFile ~/.ssh/hetzner-20251203
  IdentitiesOnly yes
```

`IdentitiesOnly yes` prevents SSH from trying all keys in `~/.ssh/`. Makes connection faster and cleaner.

## Alternative: Use Hetzner API

Hetzner has an API for managing SSH keys. Could automate key rotation through their API:

```python
import requests

headers = {"Authorization": f"Bearer {HETZNER_API_TOKEN}"}

# Get current keys
response = requests.get("https://api.hetzner.cloud/v1/ssh_keys", headers=headers)
old_keys = response.json()["ssh_keys"]

# Add new key
new_key = {
  "name": "automated-20251203",
  "public_key": PUBLIC_KEY
}
response = requests.post("https://api.hetzner.cloud/v1/ssh_keys",
                         headers=headers, json=new_key)

# Remove old keys
for key in old_keys:
  requests.delete(f"https://api.hetzner.cloud/v1/ssh_keys/{key['id']}",
                  headers=headers)
```

But this only works for Hetzner Cloud. We use dedicated servers which don't support the API for SSH key management.

## Access control

Only ops team has access to SSH private keys in Azure Key Vault. Added Azure AD group-based access:

```bash
az keyvault set-policy \
  --name our-vault \
  --object-id <ops-group-id> \
  --secret-permissions get list
```

Developers don't need SSH access to servers. If they need to debug, they use Kubernetes exec instead:

```bash
kubectl exec -it pod-name -- /bin/bash
```

This is better than SSH because:
- Access is controlled by Kubernetes RBAC
- Actions are logged in Kubernetes audit logs
- No need to manage SSH keys for every developer

## Lessons

1. Automate key rotation or it won't happen
2. Test new keys before removing old ones
3. Store keys centrally (Key Vault) not on individual machines
4. Use ed25519 for new keys
5. Have a recovery plan (KVM console, backups)

Key rotation went from "painful 2-hour manual process we avoid" to "5-minute automated script we run regularly."

Automation removes the pain, which means you actually do the security best practice instead of putting it off.
