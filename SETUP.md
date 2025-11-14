# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

3. **Login with demo credentials:**
   - Email: `demo@marines.app`
   - Password: `demo123`

## Project Structure

```
MarinesApp/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # UI components (Layout, Card, KpiCard, etc.)
│   │   ├── modules/       # Feature modules (auth)
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utilities (API client, i18n)
│   │   └── models/        # Type definitions (JSDoc)
│   └── package.json
├── backend/               # Node.js/Express backend
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── data/              # Mock data
│   └── server.js
└── package.json           # Workspace root
```

## Key Features Implemented

✅ **Multi-tenant Architecture**
- JWT-based authentication
- Tenant isolation in all API calls
- Ready for PostgreSQL + RLS

✅ **Layout System**
- Responsive sidebar (desktop: collapsible, mobile: drawer)
- Topbar with user info
- Navigation with active state

✅ **Core Pages**
- Dashboard (activity feed)
- Port Calls (list + detail with tabs)
- Fleet Map (AIS visualization)
- Vessels (list + detail)
- People, Security, Fees (skeleton pages)
- Settings (Tenant, Users, AIS Config)

✅ **AIS Integration**
- Mock AIS data provider
- Position and track endpoints
- Map visualization with Leaflet
- Ready for real AIS provider integration

✅ **Internationalization**
- Simple i18n system
- English and Portuguese (Brazil)
- Jurisdiction configuration (BR_PSP, GENERIC)

✅ **Domain Model**
- Complete type definitions
- All entities from requirements
- Ready for database migration

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Port Calls
- `GET /api/port-calls` - List (supports ?status=, ?vesselId=, ?limit=, ?sort=)
- `GET /api/port-calls/:id` - Get detail
- `POST /api/port-calls` - Create
- `PUT /api/port-calls/:id` - Update
- `DELETE /api/port-calls/:id` - Delete

### Vessels
- `GET /api/vessels` - List
- `GET /api/vessels/:id` - Get detail

### AIS
- `GET /api/ais/vessels/:vesselId/last-position` - Last position
- `GET /api/ais/vessels/:vesselId/track?hours=24` - Track history

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Settings
- `GET /api/settings/tenant` - Tenant settings
- `GET /api/settings/users` - Users list
- `GET /api/settings/ais` - AIS configuration
- `PUT /api/settings/ais` - Update AIS config

## Next Steps for Production

1. **Database Migration**
   - Replace mock data with PostgreSQL
   - Implement Row-Level Security (RLS)
   - Add migrations for all tables

2. **Authentication**
   - Implement proper password hashing (bcrypt)
   - Add refresh tokens
   - Implement password reset flow

3. **AIS Provider**
   - Integrate real AIS API (MarineTraffic, AIS API, etc.)
   - Implement scheduled polling job
   - Add rate limiting

4. **File Storage**
   - Implement attachment storage (S3, etc.)
   - Add file upload endpoints

5. **Enhanced Features**
   - Complete all tab content in Port Call detail
   - Add CRUD for all entities
   - Implement search and filtering
   - Add export functionality

6. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

7. **Deployment**
   - Environment configuration
   - CI/CD pipeline
   - Monitoring and logging

