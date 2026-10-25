# Security policy

## Scope

PetHealth is designed for **home and local networks**. It hasn't been through a security audit or penetration testing, so it shouldn't be exposed directly to the internet. To use it away from home, connect through a VPN such as WireGuard or Tailscale.

## Reporting a vulnerability

Please report security problems through **[GitHub Issues](https://github.com/chmedinap/pethealth/issues/new)**:

1. Start the title with **`[Security]`**.
2. Describe the problem, the affected version (image tag or commit) and the steps to reproduce it.
3. Explain the impact (what an attacker could see or do).

Fixes are released in a new image (`martitoci/pethealth:latest`) and listed in the release notes.

## Supported versions

Only the latest version (`latest` tag / `main` branch) receives fixes.
