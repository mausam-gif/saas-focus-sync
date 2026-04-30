# System Recovery & Rollback Plan

This document provides instructions on how to revert the system to the stable "High-Performance Dashboards" state (Commit `fa08947`) in case of future errors.

## 1. Quick Revert (Vercel Dashboard)
If a future deployment breaks the production site:
1. Go to your [Vercel Project Dashboard](https://vercel.com/mausam-gifs-projects/vast-api/deployments).
2. Locate the deployment for commit `fa08947` (tagged as `v1.0-stable-dashboards`).
3. Click the three dots (...) and select **Rollback**.
4. This will instantly make this version live without rebuilding.

## 2. Git Rollback (Local)
To revert your local code to this exact state:
```bash
git checkout v1.0-stable-dashboards
```
To force your main branch back to this state:
```bash
git checkout main
git reset --hard v1.0-stable-dashboards
git push correct-gh main --force
```

## 3. Database Integrity
This checkpoint assumes the database schema as of 2026-04-30. If you perform major `alembic` migrations later, you may need to revert those migrations before the code will work again.

---
**Checkpoint ID:** `v1.0-stable-dashboards`
**Commit Hash:** `fa08947`
**Date:** 2026-04-30
