# Referral Tracker System

## Overview
A healthcare referral tracking system with a UPS/FedEx-style tracking interface for monitoring patient referrals through different stages of care. The application provides a professional dashboard for tracking patient referrals with real-time status updates, stakeholder management, and alert systems.

## Project Architecture
- **Frontend**: Single-page HTML application with embedded CSS and JavaScript
- **Server**: Python HTTP server serving static content on port 5000
- **Integration**: Designed to work with FileMaker Pro via JavaScript API calls
- **Data**: Currently uses sample data, can be integrated with external APIs or FileMaker

## Recent Changes
- **2025-09-16**: Initial setup for Replit environment
  - Created Python HTTP server (`run_server.py`) configured for Replit
  - Set up workflow to serve the application on port 5000
  - Configured deployment for autoscale hosting
  - Added cache control headers for development

## Features
- **Patient Referral Tracking**: UPS-style timeline showing referral progress
- **Stakeholder Management**: View and filter by different roles (physicians, case managers, etc.)
- **Alert System**: Bottleneck detection and next best actions
- **Real-time Activity Feed**: Chronological view of referral activities
- **Public/Internal Modes**: Toggle between internal view and de-identified public view
- **Mobile Responsive**: Works across different screen sizes

## Technical Stack
- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Server**: Python 3 with built-in `http.server` module
- **Styling**: CSS custom properties (variables) with modern gradient design
- **Integration**: FileMaker Pro JavaScript API (fmp:// protocol)

## Key Files
- `referral_tracking.html` - Main application file with all frontend code
- `run_server.py` - Python HTTP server for Replit environment
- `server.py` - Alternative server implementation (not currently used)
- `README.md` - Original project readme

## Environment Setup
- **Port**: Uses PORT environment variable (defaults to 5000 locally)
- **Host**: 0.0.0.0 (allows external access through Replit proxy)
- **Cache Control**: Disabled for development (no-cache headers)
- **CORS**: Enabled for API integration with proper preflight support

## Usage
The application loads with sample data showing a patient referral journey through various stages:
1. Referral Received
2. Intake Review
3. Benefits Verification
4. Orders/Eligibility
5. Scheduling
6. Start of Care (Admission)

## Integration Notes
- Designed for FileMaker Pro integration using `fmp://` protocol
- `window.refresh(data)` function accepts JSON data for real-time updates
- Search functionality placeholder for API integration
- Next Best Actions trigger FileMaker scripts when clicked

## Deployment
- **Target**: Autoscale deployment (suitable for web applications)
- **Command**: `python3 run_server.py`
- **Build**: None required (static files served directly)

## User Preferences
- Clean, professional healthcare interface
- UPS/FedEx-style tracking metaphor
- Dark theme with modern gradients
- Responsive design for various devices