# How to Push Your Code to GitHub

Follow these steps to push your code to GitHub so you can deploy it.

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `nfl-betting-app` (or any name you like)
   - **Description**: Optional description
   - **Visibility**: Choose **Public** (free) or **Private** (if you have GitHub Pro)
   - **DO NOT** check "Initialize with README" (you already have code)
4. Click **"Create repository"**

## Step 2: Copy Your Repository URL

After creating the repo, GitHub will show you a page with setup instructions. Copy the URL that looks like:
- `https://github.com/your-username/your-repo-name.git` (HTTPS)
- OR `git@github.com:your-username/your-repo-name.git` (SSH)

## Step 3: Add All Files and Commit

Run these commands in your terminal (from your project directory):

```bash
# Add all files to staging
git add .

# Commit with a message
git commit -m "Initial commit - NFL betting app"
```

## Step 4: Connect to GitHub and Push

```bash
# Add GitHub as remote (replace with YOUR repository URL)
git remote add origin https://github.com/your-username/your-repo-name.git

# Push to GitHub
git push -u origin main
```

If you're asked for credentials:
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your GitHub password)
  - See "Creating a Personal Access Token" below

---

## Creating a Personal Access Token (if needed)

GitHub requires a token instead of your password:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **"Generate new token (classic)"**
3. Give it a name like "My Computer"
4. Select scopes: Check **"repo"** (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)
7. Use this token as your password when pushing

---

## Quick Command Reference

```bash
# Check status
git status

# Add all files
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Check remote
git remote -v
```

---

## Troubleshooting

### "remote origin already exists"
If you get this error, either:
- Remove and re-add: `git remote remove origin` then `git remote add origin <url>`
- Or update: `git remote set-url origin <new-url>`

### "Authentication failed"
- Make sure you're using a Personal Access Token, not your password
- Check that the token has "repo" permissions

### "Permission denied"
- Verify your GitHub username is correct
- Make sure the repository exists on GitHub
- Check that you have write access to the repository

---

## After Pushing

Once your code is on GitHub, you can:
1. **Deploy to Vercel**: Import the GitHub repo in Vercel
2. **Share the repo**: Others can clone and contribute
3. **Set up CI/CD**: Automate deployments

