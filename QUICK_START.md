# Quick Setup Checklist

## ✅ Appwrite Setup Checklist

### Step 1: Create Appwrite Project (2 minutes)
- [ ] Go to https://cloud.appwrite.io/
- [ ] Create account or login
- [ ] Click "Create Project"
- [ ] Name: "CampusHub"
- [ ] Copy Project ID

### Step 2: Enable Email Authentication (1 minute)
- [ ] Click on "Auth" in sidebar
- [ ] Email/Password should be enabled by default
- [ ] If not, click to enable it

### Step 3: Add Web Platform (1 minute)
- [ ] Go to "Settings" → "Platforms"
- [ ] Click "Add Platform" → "Web"
- [ ] Name: "CampusHub Web"
- [ ] Hostname: `localhost:3000`
- [ ] Click "Create"

### Step 4: Update Environment File (1 minute)
```bash
# Open .env.local and replace:
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<paste your project ID here>
```

### Step 5: Restart Server
```bash
# Stop the current server (Ctrl+C)
# Then run:
pnpm dev
```

### Step 6: Test It! 🎉
- [ ] Go to http://localhost:3000/login
- [ ] Click "Sign Up" tab
- [ ] Create test account:
  - Name: Test User
  - Email: test@example.com  
  - Password: password123
- [ ] Click "Create Account"
- [ ] You should be redirected to dashboard!

## 🎯 That's it! You're done!

The authentication system is now fully functional.

## Optional: Database Setup (5 minutes)

Only do this if you want to store additional user profile data beyond what Appwrite provides:

1. In Appwrite dashboard, click "Databases"
2. Click "Create Database" → Name: "CampusHub"
3. Copy Database ID → Add to `.env.local`
4. Click "Create Collection" → Name: "users"
5. Copy Collection ID → Add to `.env.local`
6. Add attributes:
   - email (string, required)
   - name (string, required)
   - role (string, required)
   - createdAt (string, required)
7. Go to Settings → Permissions → Add "Role: Users" with Create, Read, Update

**Note:** The app works perfectly without the database setup!
