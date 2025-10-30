# Supabase Local Development Setup

## ✅ Completed Steps

1. ✅ Initialized Supabase locally (`npx supabase init`)
2. ✅ Created Supabase configuration folder (`/supabase`)
3. ✅ Installed Supabase JavaScript client (`@supabase/supabase-js`)
4. ✅ Created Supabase client utility (`/src/lib/supabase.ts`)

## 🔧 Next Steps to Complete Setup

### 1. Start Docker Desktop

Supabase local development requires Docker Desktop to run the database and services.

- **macOS**: Launch Docker Desktop from Applications
- Ensure Docker is running (you should see the Docker icon in your menu bar)

### 2. Start Supabase Locally

Once Docker is running, execute:

```bash
npx supabase start
```

This command will:
- Download and start all necessary Docker containers (PostgreSQL, Auth, Storage, etc.)
- Display your local credentials including:
  - API URL
  - Anonymous Key (anon key)
  - Service Role Key
  - Studio URL

**⚠️ Important**: Save the output! You'll need these credentials for the next step.

### 3. Create `.env.local` File

Create a file named `.env.local` in the project root with the credentials from step 2:

```env
# Supabase Local Development Environment Variables
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-supabase-start>
```

Replace `<your-anon-key-from-supabase-start>` and `<your-service-role-key-from-supabase-start>` with the actual keys from the `npx supabase start` output.

### 4. Access Supabase Studio

After starting Supabase, you can access the Supabase Studio (database management UI) at:

```
http://127.0.0.1:54323
```

Here you can:
- Create tables
- Manage data
- Set up authentication
- Configure storage buckets
- Write SQL queries

## 📁 Project Structure

```
/Applications/Cursor : Supabase/Test 2/
├── supabase/
│   ├── config.toml          # Supabase configuration
│   └── migrations/          # Database migrations (create as needed)
├── src/
│   ├── lib/
│   │   └── supabase.ts      # Supabase client instance
│   └── ...
├── .env.local               # Local environment variables (create this)
└── .env.local.example       # Example env file (if created)
```

## 🚀 Using Supabase in Your App

Import the Supabase client in your components or hooks:

```typescript
import { supabase } from '@/lib/supabase';

// Example: Fetch data
const { data, error } = await supabase
  .from('your_table')
  .select('*');

// Example: Insert data
const { data, error } = await supabase
  .from('your_table')
  .insert({ column: 'value' });
```

## 🛠️ Useful Commands

```bash
# Start Supabase (must have Docker running)
npx supabase start

# Stop Supabase
npx supabase stop

# Check Supabase status
npx supabase status

# Reset database (careful - deletes all data!)
npx supabase db reset

# Create a new migration
npx supabase migration new your_migration_name

# Push migrations to local database
npx supabase db push
```

## 🔗 Configuration

Your local Supabase is configured with these ports (from `supabase/config.toml`):

- **API**: `54321`
- **Database**: `54322`
- **Studio**: `54323`
- **Inbucket (Email testing)**: `54324`
- **Analytics**: `54327`

## 📚 Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development)
- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Docker Desktop Download](https://docs.docker.com/desktop/)

## ⚠️ Troubleshooting

### Docker not running
```
Error: Cannot connect to the Docker daemon
```
**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port already in use
```
Error: Port 54321 is already in use
```
**Solution**: Either stop the service using that port or modify the port in `supabase/config.toml`.

### Environment variables not loading
**Solution**: Restart your Next.js dev server after creating/modifying `.env.local`.

