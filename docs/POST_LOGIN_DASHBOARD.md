# Post-Login Dashboard Architecture

## Overview
After successful authentication through the existing SafeWay login dashboard, users are redirected to role-based dashboards:
- **Admin**: Emergency command center, SOS monitoring, hazard management, analytics, and system health
- **Tourist**: Interactive map, stays, transport, emergency SOS, and offline tools
- **Service Provider**: Listings management, pricing, and guest reviews

## Authentication Flow
1. User logs in via existing AuthView (email/password or OAuth)
2. `useAuth()` hook reads session and role from Supabase auth
3. App redirects to role-specific dashboard
4. Session persists via Supabase JWT tokens

## Session Management
- **Provider**: `AuthProvider` wraps app and manages global session state
- **Hook**: `useAuth()` provides session, role, profile, and sign-out
- **Protected Routes**: `ProtectedRoute` enforces role-based access control

## Dashboard Routes
```
/dashboard → Role-aware landing page
/admin/emergencies → Emergency SOS command center
/admin/sos → SOS monitoring and tracking
/admin/landslides → Hazard zone management
/admin/analytics/stays → Stay price analytics
/admin/analytics/transport → Transport price analytics
/admin/services → Service provider management
/admin/github-services → Deployment monitoring
/admin/system-health → API and sync health
/tourist/map → Interactive Manali map
/tourist/stays → Accommodation booking
/tourist/transport → Transport options (Uber, Ola, HRTC, etc.)
/tourist/emergency → SOS and emergency reporting
/provider/listings → Service listings management
/provider/pricing → Pricing and availability
/provider/reviews → Guest feedback and ratings
```

## Key Components
- **AuthProvider**: Global auth state and session management
- **ProtectedRoute**: Role-based access control wrapper
- **DashboardLayout**: Navigation, header, and layout for authenticated users
- **DashboardHome**: Role-specific landing pages

## Offline Support
- **IndexedDB**: Local storage for user profile, role, and cached dashboard data
- **Service Worker**: Background sync for SOS, emergency reports, and price corrections
- **Offline Labels**: UI shows "Live", "Cached", "Offline", or "Pending sync" status
- **SOS Queue**: Emergency reports queue locally and sync when network returns

## Security Rules
- Validate session token on every protected API request
- Refresh tokens silently where supported
- Handle expired sessions with re-authentication prompt
- Prevent cross-role access (tourists cannot access admin APIs, etc.)
- Audit-log all emergency, SOS, hazard, price, and deployment actions

## Development Notes
- Replace placeholder content in dashboard pages with real components
- Implement offline caching strategy for maps, prices, and emergency contacts
- Add backend API routes for role-based authorization middleware
- Configure service worker for background sync and offline fallbacks
