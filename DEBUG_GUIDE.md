# Debug Guide - Viewing Errors and Output

## What I've Added

### 1. **Error Boundary Component** (`components/ErrorBoundary.jsx`)
   - Catches React errors and displays them on screen
   - Shows error messages and stack traces
   - Provides a "Try Again" button

### 2. **Console Logging**
   - Added `console.log()` statements throughout the app to track:
     - When components mount
     - When fonts load
     - When themes are applied
     - When navigation renders
     - Screen dimensions
     - Translation loading

### 3. **Error Handling**
   - Try-catch blocks in critical components
   - Global error listeners for unhandled errors
   - Promise rejection handlers

## How to View Errors and Output

### Option 1: View in Terminal/Console
1. Open your terminal where Expo is running
2. Look for console.log messages like:
   - `RootLayout: Component mounted`
   - `AppContent: Theme colors loaded`
   - `Index: Component rendering`
3. Look for console.error messages for any errors

### Option 2: View in Browser DevTools (Web)
1. If running on web (`npm run web` or press `w`)
2. Open browser DevTools (F12)
3. Go to Console tab
4. You'll see all console.log and console.error messages

### Option 3: View in React Native Debugger
1. Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug"
3. Open Chrome DevTools
4. Check the Console tab

### Option 4: View Error Screen
- If an error occurs, the ErrorBoundary will show a red error screen with:
  - Error message
  - Component stack trace
  - "Try Again" button

## Common Issues to Check

1. **Splash Screen Stuck**
   - Check console for: `RootLayout: Waiting for fonts, returning null`
   - If fonts never load, the app will show nothing

2. **Theme Context Error**
   - Check console for: `AppContent error:`
   - This means ThemeContext is not working

3. **Translation Error**
   - Check console for: `Index: Translation loaded`
   - If missing, i18n might not be initialized

4. **Navigation Error**
   - Check console for: `AppContent: Rendering Stack navigator`
   - If missing, navigation might be broken

## Quick Test

To test if the app can render anything, check the console for these messages in order:

```
RootLayout: Component mounted
RootLayout: Fonts loaded: true
RootLayout: Hiding splash screen
RootLayout: Rendering app with providers
AppContent: Theme colors loaded {background: '#ffffff', ...}
AppContent: Rendering Stack navigator
Index: Component rendering
Index: Router loaded
Index: Theme colors: {...}
Index: Translation loaded, welcome text: Welcome
Index: Screen dimensions: {SCREEN_WIDTH: 375, SCREEN_HEIGHT: 667}
Index: About to render JSX
```

If any of these messages are missing, that's where the problem is!

## Next Steps

1. **Check your terminal/console** - Look for the console.log messages
2. **Check for errors** - Look for console.error or red error screens
3. **Share the output** - Copy the console output and share it so we can identify the exact issue









