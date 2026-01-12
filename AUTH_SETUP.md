# CampusHub - Appwrite Authentication Setup

## 🚀 Quick Start

Your login system is ready! Follow these steps to set up Appwrite:

## 📋 Setup Instructions

### 1. Create an Appwrite Account

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/)
2. Sign up for a free account
3. Create a new project called "CampusHub"

### 2. Configure Your Project

1. In your Appwrite dashboard, note your **Project ID**
2. Go to **Settings** → Find your project ID

### 3. Set Up Authentication

1. In your Appwrite project, go to **Auth**
2. Enable **Email/Password** authentication
3. No additional configuration needed!

### 4. (Optional) Create Database for User Profiles

If you want to store additional user profile data:

1. Go to **Databases** → **Create Database**
2. Name it "CampusHub" and note the **Database ID**
3. Create a collection called "users" and note the **Collection ID**
4. Add the following attributes to the "users" collection:
   - `email` (String, Required)
   - `name` (String, Required)
   - `role` (String, Required) - Default: "student"
   - `createdAt` (String, Required)

5. Set permissions:
   - Go to **Settings** → **Permissions**
   - Add: **Role: Users** → **Create, Read, Update**

### 5. Update Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_actual_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id (optional)
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=your_collection_id (optional)
```

**Note:** Database and Collection IDs are optional. The app will work without them using only Appwrite's built-in user management.

### 6. Configure Platform Settings

In your Appwrite project settings:

1. Go to **Settings** → **Platforms**
2. Add a **Web App** platform
3. Add your localhost URL: `http://localhost:3000`
4. Add any other domains you'll use in production

### 7. Start Your Application

```bash
pnpm dev
```

Visit `http://localhost:3000/login` to test the authentication!

## 🎯 Features Included

✅ **Login Page** - Beautiful login interface at `/login`
✅ **Sign Up** - New user registration with validation
✅ **Password Security** - Toggle password visibility
✅ **Auto Redirect** - Redirects to dashboard after login
✅ **Protected Routes** - Dashboard and other pages require login
✅ **Auth Context** - Global auth state management
✅ **Logout** - Secure logout from sidebar
✅ **User Profile** - Display user info in sidebar

## 📁 Files Created

- `app/login/page.tsx` - Login/Signup page
- `lib/appwrite.ts` - Appwrite client configuration
- `lib/auth.ts` - Authentication service
- `contexts/AuthContext.tsx` - Auth state management
- `components/ProtectedRoute.tsx` - Route protection component
- `.env.local` - Environment variables

## 🔒 How It Works

1. **Login Flow:**
   - User enters credentials → Appwrite validates → Session created → Redirect to dashboard

2. **Signup Flow:**
   - User creates account → Appwrite stores user → Auto login → Optional profile creation → Redirect to dashboard

3. **Route Protection:**
   - Protected pages wrapped in `<ProtectedRoute>`
   - Checks if user is logged in
   - Redirects to `/login` if not authenticated

4. **Logout:**
   - Destroys Appwrite session
   - Clears local auth state
   - Redirects to login page

## 🛠️ Testing

**Test Account Creation:**
1. Go to `/login`
2. Click "Sign Up" tab
3. Enter: Name, Email, Password
4. Click "Create Account"
5. Should redirect to dashboard

**Test Login:**
1. Use the credentials you just created
2. Should redirect to dashboard
3. See your name in the sidebar

## 📚 Next Steps

1. **Set up your Appwrite project** (5 minutes)
2. **Update `.env.local`** with your project IDs
3. **Test login/signup** functionality
4. **(Optional) Customize** user roles and permissions

## 🎨 Customization

- **Change theme colors:** Update `tailwind.config.js`
- **Add social login:** Enable providers in Appwrite Auth
- **Add user roles:** Extend the UserProfile interface
- **Custom validation:** Modify validation in `login/page.tsx`

## 🆘 Troubleshooting

**"Failed to login"**
- Check your Appwrite endpoint and project ID
- Ensure email/password auth is enabled
- Check that platform (localhost) is added

**"Session not found"**
- Clear browser cookies
- Check that you're using the correct domain

**Environment variables not working**
- Restart the dev server after changing `.env.local`
- Ensure variables start with `NEXT_PUBLIC_`

## 📖 Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Auth Guide](https://appwrite.io/docs/products/auth)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Ready to go!** Set up your Appwrite project and start testing the authentication system. 🚀
