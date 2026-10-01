# Git Workflow Guidelines

Principles and rules for branching, committing, and deployment in this repository.

---

## 1. Branch Strategy
- **`staging` (Development & Pre-Release):**
  - All active feature development, bug fixes, refactoring, and code edits MUST take place on the `staging` branch.
  - Initial commits and testing must occur on `staging` before anything touches production.
  - Agents must check `git branch` or `git status` prior to editing or committing files to ensure they are on `staging`.
- **`main` (Production & Deployment):**
  - `main` represents live production code ([reesedrjones.com](https://reesedrjones.com/)).
  - Pushing to `main` triggers automated Cloudflare Pages builds.
  - **No Direct Edits:** Never write code or make initial commits directly on `main`.
  - Code reaches `main` only via merging from `staging` after testing and verification.

---

## 2. Standard Workflow Cycle
- **Step 1:** Verify active branch is `staging` (`git branch`). Switch if necessary (`git checkout staging`).
- **Step 2:** Make code changes, verify local builds (`npm run build`), and test changes.
- **Step 3:** Stage and commit changes to `staging` (`git add ...`, `git commit -m "..."`).
- **Step 4:** Push `staging` to remote (`git push origin staging`).
- **Step 5 (Release to Production):**
  - Checkout `main` (`git checkout main`).
  - Pull latest (`git pull origin main`).
  - Merge `staging` into `main` (`git merge staging`).
  - Push `main` (`git push origin main`).
  - Switch back to `staging` (`git checkout staging`).

---

## 3. Commit Message Conventions
- Use descriptive, lower-case prefix tags for commits:
  - `feat(...)`: New feature or user-facing addition
  - `fix(...)`: Bug fix or resolution of unexpected behavior
  - `tune(...)`: Parameter adjustment or aesthetic/performance tweaking
  - `docs(...)`: Documentation or guideline updates
  - `refactor(...)`: Code restructuring without functional changes
