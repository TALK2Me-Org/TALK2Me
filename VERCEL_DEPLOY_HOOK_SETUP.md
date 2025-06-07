# Vercel Deploy Hook Setup Guide for TALK2Me

This guide will walk you through setting up a Deploy Hook in Vercel and connecting it to your GitHub repository for automatic deployments.

## Prerequisites
- A Vercel account with a paid plan (Deploy Hooks are available on paid plans)
- Your TALK2Me repository on GitHub
- Admin access to both Vercel and GitHub

## Step 1: Create a Deploy Hook in Vercel

1. **Log in to Vercel Dashboard**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign in with your account

2. **Navigate to Your Project**
   - Click on your TALK2Me project from the dashboard
   - If you haven't imported it yet, click "Add New Project" and import from GitHub

3. **Access Project Settings**
   - Click on the "Settings" tab at the top of your project page

4. **Create Deploy Hook**
   - Scroll down to the "Git" section in the left sidebar
   - Click on "Deploy Hooks"
   - Click "Create Hook"
   - Give your hook a name (e.g., "GitHub Push Deploy")
   - Select the branch you want to deploy (typically "main" or "master")
   - Click "Create Hook"
   - **Important**: Copy the webhook URL that appears - you'll need this for GitHub

## Step 2: Configure GitHub Webhook

1. **Open Your GitHub Repository**
   - Go to your TALK2Me repository on GitHub
   - Click on "Settings" (repository settings, not account settings)

2. **Add Webhook**
   - In the left sidebar, click on "Webhooks"
   - Click "Add webhook" button

3. **Configure Webhook Settings**
   - **Payload URL**: Paste the Deploy Hook URL you copied from Vercel
   - **Content type**: Select "application/json"
   - **Secret**: Leave empty (unless you configured one in Vercel)
   - **Which events would you like to trigger this webhook?**
     - Select "Just the push event" for deployments on every push
     - Or select "Let me select individual events" for more control
   - **Active**: Make sure this checkbox is checked
   - Click "Add webhook"

## Step 3: Test Your Setup

1. **Make a Test Commit**
   ```bash
   # Make a small change to your repository
   echo "# Deploy test" >> README.md
   git add README.md
   git commit -m "Test automatic deployment"
   git push origin main
   ```

2. **Monitor Deployment**
   - Go to your Vercel dashboard
   - You should see a new deployment starting automatically
   - Click on the deployment to see real-time logs

## Step 4: Advanced Configuration (Optional)

### Deploy Only on Specific Branches
1. In Vercel Settings > Git
2. Configure "Production Branch" and "Preview Branches"
3. Create separate Deploy Hooks for different branches if needed

### Environment Variables
1. In Vercel Settings > Environment Variables
2. Add any necessary environment variables for your TALK2Me app
3. Select which deployments should use these variables (Production, Preview, Development)

### Custom Build Commands
1. In Vercel Settings > General
2. Modify "Build Command" if needed (default is usually fine for most frameworks)
3. Adjust "Output Directory" if your build outputs to a custom folder

## Step 5: Verify Everything is Working

1. **Check GitHub Webhook Status**
   - Go to Settings > Webhooks in your GitHub repository
   - You should see a green checkmark next to your webhook
   - Click on the webhook to see recent deliveries

2. **Check Vercel Deployments**
   - In Vercel dashboard, go to your project
   - Check the "Deployments" tab
   - Verify that pushes to your repository trigger new deployments

## Troubleshooting

### Webhook Not Triggering
- Verify the webhook URL is correct
- Check if the webhook is active in GitHub
- Look at the "Recent Deliveries" in GitHub webhook settings for error messages

### Deployment Failing
- Check Vercel deployment logs for build errors
- Ensure all environment variables are properly set
- Verify your build command and output directory are correct

### Multiple Deployments
- If you're getting duplicate deployments, check if you have both GitHub integration AND Deploy Hooks active
- Usually, you want either GitHub integration OR Deploy Hooks, not both

## Best Practices

1. **Use Branch Protection**
   - Set up branch protection rules in GitHub
   - Require pull request reviews before merging to main
   - This prevents accidental deployments

2. **Monitor Deploy Hooks**
   - Regularly check your webhook deliveries in GitHub
   - Set up notifications in Vercel for deployment status

3. **Secure Your Hooks**
   - Consider adding a secret to your webhook for additional security
   - Rotate your Deploy Hook URLs periodically

4. **Test in Preview First**
   - Use Vercel's preview deployments for pull requests
   - Test changes before merging to production

## Additional Resources

- [Vercel Deploy Hooks Documentation](https://vercel.com/docs/concepts/git/deploy-hooks)
- [GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks)
- [Vercel Git Integrations](https://vercel.com/docs/concepts/git)

---

Your TALK2Me repository is now set up for automatic deployments! Every push to your configured branch will trigger a new deployment on Vercel.