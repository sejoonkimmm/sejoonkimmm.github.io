---
title: "Automating SSH Key Rotation on Hetzner Servers"
date: "03.12.2025"
description: "Security audit said our SSH keys hadn't been rotated in 18 months. Wrote a script to rotate keys across all Hetzner servers and update them in Azure Key Vault. Took 3 hours to build, runs in 5 minutes."
tags: ["SSH", "Security", "Automation", "Hetzner", "Key Rotation"]
readTime: "6 min read"
---

# Automating SSH Key Rotation on Hetzner Servers

Security audit said we should rotate SSH keys regularly. I checked when we last rotated keys on our Hetzner servers. Answer: never. Same key, 18 months. Not great.

So I wrote a script. Now we rotate all SSH keys across 8 servers in about 5 minutes instead of SSH-ing into each one by hand.

## The manual process

Before I automated it, rotating keys looked like this:

1. Generate new SSH keypair locally
2. SSH into each server using old key
3. Add new public key to `~/.ssh/authorized_keys`
4. Test that new key works
5. Remove old key from `authorized_keys`
6. Update key in password manager
7. Repeat for all 8 servers

Takes about 2 hours. And it's easy to mess up. If you remove the old key before checking the new one works, you lock yourself out. I've seen it happen.

## The automated script

I created `rotate-ssh-keys.sh`:

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

Five minutes, done.

## Why ed25519 keys

I used `ssh-keygen -t ed25519` instead of RSA. A few reasons:

- Shorter keys (68 characters vs 500+ for RSA)
- Faster to generate and verify
- Better security per bit than RSA
- Resistant to timing attacks

RSA still works fine, but for new keys there's no reason not to use ed25519.

## Storing keys in Azure Key Vault

The script uploads keys to Azure Key Vault. This means they're encrypted at rest, accessible to team members who have the right permissions, backed up automatically, and audited (Azure logs who accessed them and when).

To retrieve a key from Key Vault:

```bash
az keyvault secret download \
  --vault-name our-vault \
  --name ssh-private-key \
  --file ~/.ssh/hetzner-key

chmod 600 ~/.ssh/hetzner-key
```

## Testing before removing old keys

This is the part I cared most about. The script tests that the new key actually works before it removes the old one. Without this, you're one bad key away from a lockout.

```bash
ssh -i "$KEY_NAME" -o BatchMode=yes root@$server "echo 'New key works'" || {
  echo "ERROR: New key doesn't work on $server!"
  exit 1
}
```

`-o BatchMode=yes` prevents interactive prompts. If the key doesn't work, SSH fails immediately instead of asking for a password.

If the test fails, the script stops and the old key stays in place. Nothing breaks.

## Avoiding lockouts

If something does go wrong during rotation, recovery options exist:

1. Hetzner has KVM console access in their web panel
2. You can log in via console and fix `authorized_keys` manually
3. The script also keeps backups: `authorized_keys.backup`

I've never had to use any of these. But I sleep better knowing they're there.

## Key rotation schedule

Security best practice says rotate every 90 days. We settled on every 6 months. Not perfect, but realistic.

I added it as a recurring calendar event. The script makes it painless enough that we actually follow through instead of pushing it off.

## SSH config for multiple keys

After rotation, I updated `~/.ssh/config`:

```
Host *.example.com
  User root
  IdentityFile ~/.ssh/hetzner-20251203
  IdentitiesOnly yes
```

`IdentitiesOnly yes` stops SSH from trying every key in `~/.ssh/`. Makes connections faster and avoids confusing authentication errors.

## Alternative: Use Hetzner API

Hetzner has an API for managing SSH keys. You could automate rotation through it:

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

This only works for Hetzner Cloud though. We use dedicated servers, which don't support the API for SSH key management. A bit annoying, but that's why I went with the shell script approach.

## Access control

Only the ops team can access SSH private keys in Azure Key Vault. I set up Azure AD group-based access:

```bash
az keyvault set-policy \
  --name our-vault \
  --object-id <ops-group-id> \
  --secret-permissions get list
```

Developers don't need SSH access to the servers. If they need to debug something, they use Kubernetes exec:

```bash
kubectl exec -it pod-name -- /bin/bash
```

This works better than SSH because access is controlled by Kubernetes RBAC, actions show up in audit logs, and we don't need to manage SSH keys for every developer on the team.

## Lessons

1. Automate key rotation or it won't happen
2. Test new keys before removing old ones
3. Store keys in one central place (Key Vault), not on individual machines
4. Use ed25519 for new keys
5. Have a recovery plan (KVM console, backups)

Key rotation went from a painful 2-hour manual process we kept avoiding to a 5-minute script we actually run on schedule. Sometimes the best security improvement is just making the right thing easy to do.
