---
name: release-verification
description: Use before merging to main or deploying to Tencent Cloud Lighthouse.
---

# Release Verification

1. Confirm the target revision is committed and based on latest `main`.
2. Run `npm run verify:full`.
3. For UI changes, confirm user acceptance of the local review URL.
4. Choose the smallest deploy target: `web`, `api`, or `all`.
5. Use GitHub Actions production Environment approval.
6. Verify the live URL and health endpoint.
7. Report old revision, new revision, service, URL, health result, and rollback command.
