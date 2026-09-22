#cloud-config
# Bootstraps a fresh Ubuntu 22.04 droplet with Docker + Docker Compose and
# prepares the deploy directory. GitHub Actions handles pushing the actual
# application containers after this initial provisioning.

package_update: true
package_upgrade: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release
  - ufw
  - fail2ban

write_files:
  - path: /etc/environment
    append: true
    content: |
      STACKPRIME_ENVIRONMENT=${environment}

runcmd:
  # --- Docker Engine + Compose plugin ---
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
  - apt-get update -y
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # --- Non-root deploy user for GitHub Actions SSH deploys ---
  - useradd -m -s /bin/bash deploy || true
  - usermod -aG docker deploy
  - mkdir -p /home/deploy/.ssh
  - cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  - chown -R deploy:deploy /home/deploy/.ssh
  - chmod 700 /home/deploy/.ssh
  - chmod 600 /home/deploy/.ssh/authorized_keys

  # --- App directory ---
  - mkdir -p /opt/stackprime-marketing-site
  - chown deploy:deploy /opt/stackprime-marketing-site

  # --- Firewall (defense in depth alongside the DO Cloud Firewall resource) ---
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow OpenSSH
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable

  # --- fail2ban for SSH brute-force protection ---
  - systemctl enable fail2ban
  - systemctl start fail2ban

  - systemctl enable docker
  - systemctl start docker
