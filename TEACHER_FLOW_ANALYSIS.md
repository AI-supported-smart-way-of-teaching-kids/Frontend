# Teacher Flow Analysis

## Overview
This document provides a comprehensive analysis of the teacher signup, profile setup, and dashboard implementation.

---

## 1. Teacher Signup Flow (`app/(drawer)/login.jsx`)

### Flow Summary
1. User selects "teacher" role
2. User enters signup details (name, email, password, confirm password)
3. Registration API call is made
4. Auto-login after successful registration
5. Redirect to teacher dashboard

### Key Components

#### A. Role Selection
```jsx
// Lines 567-587: Role tabs for parent/teacher selection
const [role, setRole] = useState("parent" | "teacher");
```

**Features:**
- Visual tabs with icons (👨‍🏫 for teacher, 👨‍👩‍👧 for parent)
- Role-specific color theming (blue for teacher, green for parent)
- Role state resets form fields when switched

#### B. Signup Form (`handleSignUp` function - Lines 274-378)

**Validation:**
- ✅ Name required
- ✅ Email required
- ✅ Password minimum 6 characters
- ✅ Password confirmation must match

**Registration Process:**
```javascript
// Lines 292-312: Registration payload
const registerPayload = {
  name: trimmedName,
  first_name: firstName,      // Split from full name
  last_name: lastName,         // Split from full name
  email: userEmail,
  password: password,
  role: role,                  // "teacher"
  username: userEmail,         // Uses email as username
};
```

**API Call:**
- Endpoint: `POST /api/profiles/auth/register/`
- Service: `profilesApi.register(registerPayload)`
- Handles name splitting for backend compatibility

**Post-Registration:**
1. Automatic login attempt with new credentials (Lines 319-323)
2. User context update via `login()` function
3. Role stored in AsyncStorage
4. Navigation to `/dashboard/teacher`

**Error Handling:**
- ✅ 400 errors: Extracts detailed error messages from response
- ✅ 409 errors: Email already exists
- ✅ Network errors: Generic error message
- ✅ Displays errors in user-friendly format

---

## 2. Teacher Profile Setup (`app/teacher-profile-setup.jsx`)

### Flow Summary
1. Teacher completes signup and lands on dashboard
2. Dashboard checks for teacher profile
3. If no profile exists, teacher is redirected to profile setup (optional)
4. Teacher enters bio information
5. Profile is saved to AsyncStorage
6. Redirect back to dashboard

### Key Components

#### A. Profile Creation (`handleCreateProfile` - Lines 31-92)

**Validation:**
- Bio field is required (but can be skipped)
- User must be logged in as teacher
- Role verification before allowing profile creation

**Profile Structure:**
```javascript
// Lines 46-53: Teacher profile object
const teacherProfile = {
  userId: user.id,
  email: user.email,
  name: user.name,
  bio: bio.trim(),
  uploaded_count: 0,
  created_at: new Date().toISOString(),
};
```

**Storage:**
- Primary: AsyncStorage key `@app_teacher_profiles_v1`
- Format: Object with userId as keys: `{ [userId]: profile }`
- Also stores: `@current_teacher_profile` for quick access

**Features:**
- ✅ Character counter (500 max for bio)
- ✅ Skip option (creates minimal profile)
- ✅ Professional UI with blue theme
- ✅ Responsive design

#### B. Profile Loading Flow

**Current Implementation:**
- Profile setup is **optional** - teachers can skip and access dashboard
- Profile stored locally only (AsyncStorage)
- No automatic redirect from dashboard if profile doesn't exist

**Potential Issues:**
- ❌ No backend API integration for profile persistence
- ❌ Profile data stored only in AsyncStorage (lost on app uninstall)
- ❌ No profile update functionality in setup screen

---

## 3. Teacher Dashboard (`app/dashboard/teacher.jsx`)

### Flow Summary
1. Dashboard checks user authentication and role
2. Loads teacher profile from backend/local storage
3. Displays dashboard with profile photo
4. Loads content (videos, quizzes, collections)
5. Provides CRUD operations for educational content

### Key Components

#### A. Profile Loading (Lines 293-357)

**Loading Priority:**
1. **Backend API** (`profilesApi.getTeacher(user.id)`) - Lines 302-317
2. **Local Storage** (`AsyncStorage.TEACHER_PROFILES`) - Lines 324-340
3. **Fallback**: Allow access even if no profile found - Lines 342-347

**Profile State Management:**
```javascript
// Two separate state variables:
const [teacherProfile, setTeacherProfile] = useState(null); // Full profile object
const [profile, setProfile] = useState(null);                // Just photo data
```

**Loading Behavior:**
- ✅ Dashboard shows loading spinner while checking profile
- ✅ Profile is optional - doesn't block dashboard access
- ✅ Profile photo displayed in floating button (top-left)

#### B. Profile Photo Management (`pickProfilePhoto` - Lines 240-290)

**Features:**
- ✅ Image picker with permission handling
- ✅ Square crop (1:1 aspect ratio)
- ✅ Quality optimization (0.7)
- ✅ Updates both local profile and state
- ✅ Saves to `TEACHER_PROFILES` storage

**Storage Flow:**
1. User picks photo from gallery
2. Photo URI stored in teacher profile object
3. Profile saved to AsyncStorage
4. State updated for immediate UI refresh

#### C. Dashboard Sections

**Available Sections:**
- `dashboard` - Overview/home
- `videos` - Lesson/video management
- `quizzes` - Quiz creation and management
- `progress` - Student progress tracking

#### D. Content Management

**Videos/Lessons:**
- Create, edit, delete lessons
- Collection organization
- Backend API integration via `lessonsApi`

**Quizzes:**
- Multi-question quiz builder
- Text, image, and audio question types
- Linked to videos/lessons
- Backend API integration via `quizApi`

**Progress Tracking:**
- View student progress records
- Backend API integration via `progressApi`
- Displays completion status, points earned

#### E. UI Features

**Floating Actions (Lines 1198-1262):**
- **Profile Photo Button** (top-left): Opens image picker
- **Language Switcher**: Toggles between en/ti/am
- **Logout Button**: Clears user data and redirects to login

**Loading States:**
- Shows spinner while `loading || !teacherProfile`
- Content loads asynchronously
- Fallback to local storage if backend fails

---

## Architecture Analysis

### Strengths ✅

1. **Separation of Concerns**
   - Clean API service layer (`profilesApi`, `lessonsApi`, etc.)
   - Context-based state management (`UserContext`)
   - Modular component structure

2. **Error Handling**
   - Comprehensive error catching
   - User-friendly error messages
   - Fallback mechanisms (local storage when backend fails)

3. **User Experience**
   - Smooth role switching
   - Auto-login after signup
   - Loading indicators
   - Responsive design

4. **Data Persistence**
   - AsyncStorage for offline support
   - Backend API integration
   - Dual storage strategy (local + remote)

### Issues & Recommendations ⚠️

#### Critical Issues

1. **Profile Backend Integration Missing**
   ```
   ❌ teacher-profile-setup.jsx only saves to AsyncStorage
   ❌ No API call to create teacher profile on backend
   ❌ Profile data not synced with server
   ```

   **Recommendation:**
   - Add backend API endpoint for teacher profiles
   - Integrate `profilesApi.createTeacher()` in profile setup
   - Sync local storage with backend

2. **Profile Check Logic Inconsistency**
   ```
   ❌ Dashboard checks for profile but allows access without it
   ❌ No clear redirect from dashboard to profile setup if profile missing
   ❌ Profile setup screen is not automatically triggered
   ```

   **Recommendation:**
   - Add navigation logic to redirect to profile setup if no profile exists
   - Or make profile optional and accessible from dashboard

3. **Profile Photo Storage**
   ```
   ❌ Profile photos stored as local URIs only
   ❌ No upload to backend/server
   ❌ Photos won't persist across devices
   ```

   **Recommendation:**
   - Implement image upload to backend
   - Store photo URLs instead of local URIs
   - Add image upload API integration

#### Minor Issues

4. **State Duplication**
   ```
   ⚠️ Two separate profile states: teacherProfile and profile
   ⚠️ Could be unified into single state object
   ```

5. **No Profile Edit Screen**
   ```
   ⚠️ Can only create profile once in setup screen
   ⚠️ No way to edit bio or other profile fields from dashboard
   ```

6. **Loading State Logic**
   ```
   ⚠️ Dashboard waits for teacherProfile but it's optional
   ⚠️ Loading condition: `if (loading || !teacherProfile)` blocks access
   ```

   **Recommendation:**
   ```javascript
   // Change to:
   if (loading) {
     return <LoadingScreen />;
   }
   // Profile is optional, so don't block on !teacherProfile
   ```

---

## Data Flow Diagram

```
┌─────────────────┐
│   Login Page    │
│  (role:teacher) │
└────────┬────────┘
         │
         │ handleSignUp()
         ▼
┌─────────────────┐
│  Register API   │
│ POST /auth/     │
│    register/    │
└────────┬────────┘
         │
         │ Auto-login
         ▼
┌─────────────────┐
│ Teacher Context │
│   (UserContext) │
└────────┬────────┘
         │
         │ router.replace("/dashboard/teacher")
         ▼
┌─────────────────┐
│ Teacher         │
│ Dashboard       │
└────────┬────────┘
         │
         │ Check Profile
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────┐    ┌─────────────────┐
│ Profile     │    │ Profile Setup   │
│ Exists      │    │ (Optional)      │
└──────┬──────┘    └────────┬────────┘
       │                    │
       │                    │ Save to AsyncStorage
       │                    ▼
       │            ┌─────────────────┐
       │            │ AsyncStorage    │
       │            │ @app_teacher_   │
       │            │ profiles_v1     │
       └────────────┴─────────────────┘
                    │
                    │ Load Profile
                    ▼
         ┌──────────────────────┐
         │ Display Dashboard    │
         │ - Profile Photo      │
         │ - Content Management │
         │ - Progress Tracking  │
         └──────────────────────┘
```

---

## API Integration Status

### Implemented ✅
- `POST /api/profiles/auth/register/` - User registration
- `POST /api/profiles/auth/login/` - User authentication
- `GET /api/profiles/teachers/me/` - Get teacher profile (backend)
- Content APIs (lessons, quizzes, collections)
- Progress tracking APIs

### Missing ❌
- `POST /api/profiles/teachers/` - Create teacher profile
- `PUT /api/profiles/teachers/me/` - Update teacher profile
- Image upload endpoint for profile photos
- Profile photo URL storage

---

## Recommendations for Improvement

### High Priority 🔴

1. **Add Backend Profile Creation**
   ```javascript
   // In teacher-profile-setup.jsx handleCreateProfile()
   const backendProfile = await profilesApi.createTeacher({
     user: user.id,
     bio: bio.trim(),
   });
   ```

2. **Fix Dashboard Loading Logic**
   ```javascript
   // Remove !teacherProfile from loading condition
   if (loading) {
     return <LoadingScreen />;
   }
   ```

3. **Add Profile Edit Functionality**
   - Create profile edit screen or modal
   - Allow updating bio from dashboard
   - Add backend update API integration

### Medium Priority 🟡

4. **Image Upload Integration**
   - Add photo upload API call
   - Store photo URLs instead of local URIs
   - Implement photo sync across devices

5. **Profile Navigation Flow**
   - Add "Complete Profile" button in dashboard if profile incomplete
   - Or redirect to profile setup on first login

6. **Unify Profile State**
   - Consolidate `teacherProfile` and `profile` states
   - Single source of truth for profile data

### Low Priority 🟢

7. **Add Profile Validation**
   - Enforce minimum profile completion
   - Add profile completion percentage indicator

8. **Enhanced Error Messages**
   - More specific error handling for profile operations
   - Better user guidance for profile setup

---

## Testing Recommendations

### Test Cases to Add

1. **Signup Flow**
   - ✅ Teacher role selection works
   - ✅ Registration with valid data
   - ✅ Auto-login after registration
   - ✅ Navigation to dashboard

2. **Profile Setup**
   - ✅ Profile creation with bio
   - ✅ Profile skip functionality
   - ✅ Profile saved to AsyncStorage
   - ⚠️ Backend profile creation (when implemented)

3. **Dashboard**
   - ✅ Profile loading from backend
   - ✅ Profile loading from local storage
   - ✅ Profile photo picker
   - ✅ Dashboard access without profile
   - ⚠️ Profile edit functionality (when implemented)

---

## Conclusion

The teacher flow is well-structured with good separation of concerns and error handling. However, there are critical gaps in backend integration for profile management. The profile setup currently only works with local storage, which means profile data is not persisted across devices or app reinstalls.

**Priority fixes:**
1. Integrate backend API for teacher profile creation
2. Fix dashboard loading logic to not block on optional profile
3. Add profile photo upload to backend
4. Implement profile edit functionality

The overall architecture is solid and can easily accommodate these improvements.


