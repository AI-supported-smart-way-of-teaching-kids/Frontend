# Smart Kids Learning

An AI-supported smart way of teaching, designed for kids, parents, and teachers. This mobile app facilitates interactive learning experiences with personalized dashboards for different user roles.

## Features

- **Multi-Role Support**: Separate dashboards for Kids, Parents, and Teachers
- **Multilingual**: Supports English, Amharic, and Tigrigna languages
- **Interactive Learning**: AI-enhanced educational content
- **PDF Viewing**: Integrated PDF viewer for documents and lessons
- **Image Handling**: Image picker for uploads and interactions
- **Cross-Platform**: Runs on Android, iOS, and Web

## Tech Stack

- **Framework**: [Expo](https://expo.dev) with React Native
- **Language**: TypeScript and JavaScript
- **Navigation**: Expo Router with React Navigation
- **Internationalization**: i18next
- **UI Components**: Custom components with Expo Vector Icons
- **State Management**: React Context for themes, languages, and user data

## Getting Started

### Prerequisites

- Node.js (version 18 or later)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Smart-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Run on your preferred platform:
   - **Android**: `npm run android` or press `a` in the Expo CLI
   - **iOS**: `npm run ios` or press `i` in the Expo CLI (macOS only)
   - **Web**: `npm run web` or press `w` in the Expo CLI

## Project Structure

- `app/`: Main application screens and layouts
- `components/`: Reusable UI components
- `contexts/`: React contexts for state management
- `locales/`: Translation files for internationalization
- `assets/`: Images, fonts, and other static assets
- `src/`: API utilities

## Usage

1. Launch the app and select your role (Kid, Parent, or Teacher)
2. Sign in or create an account
3. Access your personalized dashboard
4. Explore learning materials, manage lessons, or monitor progress

## Development

- Use `npm run lint` to run ESLint
- Reset the project with `npm run reset-project` (moves starter code to app-example)

## Contributing

This project is developed by Mekelle University Software Engineering students (October 2024).

## License

See [LICENSE](LICENSE) file for details.

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)
