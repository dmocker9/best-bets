# Deployment Guide - Sharing Your UI

This guide covers how to deploy your Next.js application so people across the country can access it.

## Quick Start: Deploy to Vercel (Recommended)

Vercel is the easiest option for Next.js apps and offers free hosting.

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended) or email

2. **Push Your Code to GitHub** (if not already)
   ```bash
   git init  # if not already initialized
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Import Project to Vercel**
   - Click "Add New Project" in Vercel dashboard
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

4. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add your Supabase credentials:
     - `SUPABASE_URL` = your Supabase project URL
     - `SUPABASE_ANON_KEY` = your Supabase anon key
   - These are available from: https://app.supabase.com/project/_/settings/api

5. **Deploy**
   - Click "Deploy"
   - Your app will be live at `your-project-name.vercel.app`
   - You can add a custom domain later

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel
   ```

3. **Add Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

---

## Alternative Deployment Options

### Netlify

1. **Create Account**: [netlify.com](https://netlify.com)
2. **Connect Repository**: Link your GitHub repo
3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. **Environment Variables**: Add in Site settings → Environment variables
5. **Deploy**: Netlify auto-deploys on git push

### Railway

1. **Create Account**: [railway.app](https://railway.app)
2. **New Project**: Create from GitHub repo
3. **Environment Variables**: Add in Variables tab
4. **Deploy**: Railway auto-detects Next.js and deploys

### Render

1. **Create Account**: [render.com](https://render.com)
2. **New Web Service**: Connect GitHub repo
3. **Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Environment Variables**: Add in Environment section
5. **Deploy**: Render builds and deploys automatically

---

## Pre-Deployment Checklist

Before deploying, make sure:

- [ ] **Environment Variables**: Your `.env` file has the correct Supabase credentials
- [ ] **Build Test**: Run `npm run build` locally to ensure no build errors
- [ ] **API Routes**: Test your API routes work correctly
- [ ] **Supabase RLS**: Ensure Row Level Security policies allow public access where needed
- [ ] **CORS**: If using external APIs, configure CORS in `next.config.ts` if needed

### Test Build Locally

```bash
npm run build
npm start
```

Visit `http://localhost:3000` to test the production build.

---

## Post-Deployment

### Custom Domain (Optional)

1. **Vercel**: Go to Project Settings → Domains → Add Domain
2. **Netlify**: Site Settings → Domain Management → Add Custom Domain
3. Follow DNS configuration instructions

### Monitoring

- **Vercel**: Built-in analytics and monitoring
- **Netlify**: Built-in analytics (paid plan)
- **Add Analytics**: Consider adding Google Analytics or similar

---

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Supabase Keys**: Use `ANON_KEY` for client-side, keep `SERVICE_ROLE_KEY` server-side only
3. **API Routes**: Validate inputs in your API routes
4. **Rate Limiting**: Consider adding rate limiting for API routes

---

## Troubleshooting

### Build Fails

- Check build logs in deployment platform
- Ensure all dependencies are in `package.json`
- Verify TypeScript errors are resolved

### Environment Variables Not Working

- Ensure variables are set in deployment platform (not just locally)
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### API Routes Not Working

- Check Supabase connection
- Verify RLS policies allow necessary access
- Check server logs in deployment platform

---

## Quick Commands Reference

```bash
# Test production build locally
npm run build
npm start

# Deploy to Vercel (if using CLI)
vercel
vercel --prod

# Check deployment status
vercel ls
```

---

## Recommended: Vercel

**Why Vercel?**
- Made by Next.js creators
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Free tier includes:
  - Unlimited personal projects
  - 100GB bandwidth/month
  - Automatic deployments on git push
  - Preview deployments for PRs

**Free Tier Limits:**
- 100GB bandwidth/month
- 100 hours serverless function execution/month
- Perfect for sharing with friends/family/small audience

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Supabase Docs: https://supabase.com/docs

