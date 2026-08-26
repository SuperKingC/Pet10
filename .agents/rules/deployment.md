# Deployment Rules

- Only deploy committed `main` revisions.
- Production secrets stay on the server and in GitHub Secrets; never commit or print them.
- Use the repository deployment scripts, not ad-hoc production commands.
- Prefer `assets` for tarot image changes and `api` for backend-only changes.
- Use `all` only for Compose, environment, shared-contract, or infrastructure changes.
- Do not run destructive volume commands such as `docker compose down -v`.
- Record the previous revision before deployment.
- Run health checks after deployment and report the live URL and revision.
- Database migrations require explicit human approval and are outside ordinary rollback.
