#!/usr/bin/env bash
set -euo pipefail

REPO_NAME=${1:-docpackr}
GH_USER=${GH_USER:-${GITHUB_USER:-}}
GH_TOKEN=${GH_TOKEN:-${GITHUB_TOKEN:-}}

if [[ -z "${GH_USER}" || -z "${GH_TOKEN}" ]]; then
  echo "GH_USER and GH_TOKEN must be set in env" >&2
  exit 1
fi

# Create repo (idempotent)
HTTP_CODE=$(curl -sS -o /tmp/gh_resp.json -w "%{http_code}" \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"${REPO_NAME}\",\"private\":false,\"description\":\"DocPackr\"}") || true

if [[ "${HTTP_CODE}" != "201" && "${HTTP_CODE}" != "422" ]]; then
  echo "GitHub API returned ${HTTP_CODE}" >&2
  cat /tmp/gh_resp.json >&2 || true
  exit 1
fi

git branch -M main || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
git push -u origin main

echo "Pushed to https://github.com/${GH_USER}/${REPO_NAME}"

