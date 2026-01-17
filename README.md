# mchacks

Friends-only betting app with personality. Built with Expo, React Native, and TypeScript.

## Features

- **Authentication**: Auth0 integration for secure login
- **Feed Tab**: Browse active and resolved bets
- **Create Bet Tab**: Create binary or ranked bets with event selection
- **Leaderboard Tab**: View rankings with agent-generated messages (Gumloop integration)
- **Bet Resolution**: Manual and automatic bet resolution
- **Types**: Full TypeScript support with comprehensive type definitions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (install globally with `npm install -g expo-cli`)

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Auth0 Configuration
EXPO_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your-client-id
EXPO_PUBLIC_AUTH0_AUDIENCE=your-api-audience

# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### Installation

1. Install dependencies:
```bash
npm install
```

or

```bash
yarn install
```

### Running the App

- Start the development server:
```bash
npm start
```

- Run on iOS simulator:
```bash
npm run ios
```

- Run on Android emulator:
```bash
npm run android
```

- Run in web browser:
```bash
npm run web
```

## Project Structure

```
mchacks/
├── App.tsx                  # Main app component with navigation
├── assets/                  # Images, fonts, and other assets
├── components/              # Reusable React components
│   └── BetResolutionModal.tsx
├── contexts/                # React Context providers
│   └── AuthContext.tsx      # Auth0 authentication context
├── screens/                 # Screen components
│   ├── LoginScreen.tsx      # Auth0 login screen
│   ├── FeedScreen.tsx       # Bet feed display
│   ├── CreateBetScreen.tsx  # Bet creation form
│   └── LeaderboardScreen.tsx # Leaderboard with agent messages
├── services/                # API and external services
│   ├── api.ts              # FastAPI backend integration
│   └── auth0.ts            # Auth0 authentication service
├── types/                   # TypeScript type definitions
│   └── index.ts            # All data model types
├── app.json                 # Expo configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Backend Integration

The app is designed to work with a FastAPI backend. Update the `EXPO_PUBLIC_API_URL` environment variable to point to your backend server.

### API Endpoints (Expected)

- `GET /health` - Health check
- `GET /events` - Get events list
- `POST /events/refresh` - Refresh events
- `GET /bets` - Get bets (supports `group_id` and `status` params)
- `POST /bets` - Create a new bet
- `POST /bets/{id}/resolve` - Resolve a bet
- `POST /wagers` - Create a wager
- `GET /leaderboard` - Get leaderboard (supports `group_id` param)
- `GET /users/me` - Get current user info

## Development Notes

- The app currently uses dummy data for development
- Replace TODO comments in API service calls when backend is ready
- Auth0 tokens are stored securely using Expo SecureStore
- All API requests include JWT authentication headers automatically

## Tech Stack

- **Frontend**: Expo, React Native, TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **Authentication**: Auth0 (expo-auth-session)
- **Storage**: Expo SecureStore, AsyncStorage
- **Backend**: FastAPI (Python) - separate repository
- **Database**: MongoDB - separate repository
- **Agents**: Gumloop - for personality features

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Auth0 React Native Guide](https://auth0.com/docs/quickstart/native/react-native)