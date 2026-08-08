# DigitalOcean Deployment Guide
## How to update your WhatsApp bot after making changes

### Step 1: Make changes locally
- Edit your bot code in your local machine
- Test the changes locally to ensure they work

### Step 2: Commit and push to GitHub
```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

### Step 3: SSH into DigitalOcean
```bash
ssh root@your-droplet-ip
```

### Step 4: Navigate to bot directory
```bash
cd ~/immigration-whatsapp-bot
```

### Step 5: Pull changes from GitHub
```bash
git stash
git pull
git stash pop
```
- `git stash` saves your local `.env` file with API keys
- `git pull` downloads new code from GitHub
- `git stash pop` restores your `.env` file

### Step 6: Install new dependencies (if needed)
```bash
npm install
```
- Only needed if you added new packages to `package.json`

### Step 7: Restart the bot with PM2
```bash
pm2 restart immigration-bot --update-env
```

### Step 8: Verify the bot is running
```bash
pm2 list
```
- Status should show: `online`

### Step 9: Check logs if there are issues
```bash
pm2 logs immigration-bot
```
- Press `Ctrl+C` to exit logs

### Step 10: Exit SSH
```bash
exit
```

---

## Quick Reference (One-liner)
```bash
ssh root@your-droplet-ip "cd ~/immigration-whatsapp-bot && git stash && git pull && git stash pop && pm2 restart immigration-bot --update-env"
```

---

## Troubleshooting

### Error: "Your local changes to .env would be overwritten"
**Solution:** Use the stash method (Step 5) or:
```bash
git checkout .env
git pull
# Then re-add your API keys to .env
```

### Bot not starting after restart
**Check logs:**
```bash
pm2 logs immigration-bot
```

### PM2 process not found
**Check correct process name:**
```bash
pm2 list
```
Use the exact name shown in the list.

### Need to reinstall everything
```bash
cd ~/immigration-whatsapp-bot
rm -rf node_modules package-lock.json
npm install
pm2 restart immigration-bot --update-env
```

---

## Important Notes
- Never commit your `.env` file with real API keys to GitHub
- Always use `git stash` before pulling to preserve your environment variables
- The `--update-env` flag ensures PM2 reloads environment variables
- Test changes locally before deploying to avoid downtime
