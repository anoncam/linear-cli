# Publishing Setup Instructions

This document provides instructions for setting up the automated release and publishing workflow for this package.

## Required GitHub Secrets

The GitHub Actions workflow requires the following secrets to be set up in your repository:

1. `NPM_TOKEN` - An npm access token with publish permissions

## Setting up NPM Token

1. Create an npm account if you don't have one already
2. Generate an access token:
   - Go to npmjs.com and log in
   - Click on your profile picture and select "Access Tokens"
   - Click "Generate New Token" and choose "Publish"
   - Copy the generated token

3. Add the token to GitHub Secrets:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## How the Release Process Works

The automated release process will:

1. Trigger on every push to the main branch
2. Run tests and linting
3. Automatically bump the patch version
4. Create a new Git tag and GitHub Release
5. Generate release notes from commit messages
6. Build and publish the package to npm
7. Generate and attach a Software Bill of Materials (SBOM)

## Customizing the Version Bump

By default, the workflow bumps the patch version (e.g., 1.0.0 → 1.0.1). If you want to change this behavior:

1. For manual version control, you can edit the `bump_version` step in `.github/workflows/release.yml` 
2. For semantic versioning based on commit messages, consider adding a tool like `semantic-release`

## Testing the Release Process

Before setting up the workflow on your main branch, you can:

1. Create a test branch
2. Modify the workflow to trigger on that branch
3. Push changes to verify that everything works as expected
4. Once confirmed, revert the trigger to main branch only