# infra/

Infrastructure-as-code and deployment helpers.

Local development uses the root [`docker-compose.yml`](../docker-compose.yml)
(MongoDB single-node replica set + Redis). This directory holds anything that
graduates beyond local dev:

- CI/CD pipeline definitions and helper scripts
- Production manifests (container platform / Kubernetes) for the launch swap
  described in `IMPLEMENTATION_PLAN.md` §2 (Atlas M10+, managed Redis, paid
  compute)
- Provisioning / IaC (Terraform or equivalent) once a cloud target is chosen

Kept intentionally empty for Phase 0 beyond this note.
