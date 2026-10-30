# SPMS – Solar Performance Monitoring System

A responsive, feature-complete React application for homeowners and solar technicians to monitor generation, diagnose issues, manage warranties, and connect with nearby certified technicians.

---

## Features

- **Real-Time Telemetry Dashboard**: Solar generation metrics (current power, energy today, monthly total, cell temperature, performance ratio, and active alerts) plotted with interactive Recharts.
- **Solar Simulator & Performance Engine**: Client-side solar geometry calculations (declination, hour angles, solar elevation, azimuth, incidence angles, and temperature derating factor) comparing actual output against theoretical models.
- **Grounded AI Solar Assistant**: Grounded assistant answering questions regarding power generation, active alerts, component warranties, and maintenance records using real telemetry context.
- **Warranty Management**: Component-level tracking with real-time expiration countdowns and status indicators (Active, Expiring Soon, Expired).
- **Verified Technician Directory**: Geolocation and Haversine distance search, city / postal code filtering, and skill specialization filters.
- **Service Request & Field Log Lifecycle**: Complete workflow for submitting requests, assigning technicians, tracking progress, and recording field findings and repair notes.
- **Role-Based Portals**: Dedicated portals for Homeowners and Technicians with instantaneous persona switching.

---

## Technology Stack

- **Framework**: React 18 SPA (Vite, TypeScript)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router 6

---

## Development

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

---

## License

MIT