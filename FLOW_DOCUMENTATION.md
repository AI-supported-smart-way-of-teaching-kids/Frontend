# 🧠 Behind the Scenes: Parent → Child Flow

## Overview
This document explains what actually happens behind the scenes when a parent logs in, selects a child, and the kid dashboard opens.

---

## 1️⃣ Parent Login (Real Login)

### What Happens:
1. **User Input**: Parent enters email + password in `app/(drawer)/login.jsx`
2. **Authentication Check**: 
   - Currently: Checks against local `AsyncStorage` (`@app_users`) and mock users
   - **Future**: Will call backend API to authenticate and receive JWT token
3. **User Context Update**: 
   - `UserContext.login()` is called with user data (without password)
   - User object stored in `AsyncStorage` with key `"user"`
   - Role stored in `AsyncStorage` with key `"role"`
4. **Navigation**: Router navigates to `/dashboard/parent`

### Code Locations:
- **Login Handler**: `app/(drawer)/login.jsx` → `handleSignIn()` (lines 233-283)
- **User Context**: `contexts/UserContext.tsx` → `login()` function (line 54)
- **Storage**: User saved to `AsyncStorage` (line 269 in login.jsx)

### Current Implementation:
```javascript
// login.jsx - handleSignIn()
const user = (allUsers[role] || []).find(
  (u) => u.email.trim().toLowerCase() === cleanEmail && u.password === cleanPassword
);
if (user) {
  const { password: _, ...safeUser } = user;
  login(safeUser);  // Updates UserContext
  await AsyncStorage.setItem("role", role);
  await AsyncStorage.setItem("user", JSON.stringify(safeUser));
  router.replace(roleRouteMap[role]);
}
```

### Future (With Backend):
```javascript
// Will use JWT tokens
const response = await api.post('/auth/login', { email, password });
await AsyncStorage.setItem("access", response.data.access);  // JWT token
await AsyncStorage.setItem("refresh", response.data.refresh);
```

---

## 2️⃣ Parent Selects a Child

### What Happens:
1. **Child Selection**: Parent taps on a child card in `app/dashboard/parent.jsx`
2. **Child Storage**: 
   - Selected child object is stored in `AsyncStorage` with key `"@selected_child"`
   - Child object contains: `id` (child_id), `nickname`, `avatarUrl`, `age`, `parentPhone`, `learningLevel`
3. **Mode Switch**: App navigates to `/dashboard/kids` (kid mode)
4. **Child Profile Load**: 
   - Kids dashboard loads child from `@selected_child` in AsyncStorage
   - Uses `child_id` to load child-specific progress and data
   - If no child is selected, redirects back to parent dashboard

### Code Locations:
- **Selection Handler**: `app/dashboard/parent.jsx` → `handleSelectChild()` (lines 239-249)
- **Storage Key**: `"@selected_child"` (line 242)
- **Child Loading**: `app/dashboard/kids.jsx` → `loadSelectedChild()` (on mount)

### Current Implementation:
```javascript
// parent.jsx - handleSelectChild()
const handleSelectChild = async (child) => {
  try {
    await AsyncStorage.setItem("@selected_child", JSON.stringify(child));
    router.push("/dashboard/kids");  // App switches to kid mode
  } catch (e) {
    console.warn("Failed to store selected child:", e);
    Alert.alert("Error", "Failed to select child. Please try again.");
  }
};

// kids.jsx - loadSelectedChild() (runs on mount)
const loadSelectedChild = async () => {
  try {
    const stored = await AsyncStorage.getItem("@selected_child");
    if (stored) {
      const childData = JSON.parse(stored);
      setSelectedChild(childData);
      // Use child_id to load child-specific progress
      if (childData.id) {
        const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
        const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
        const childProgress = studentProgress[childData.id] || {
          videosCompleted: [],
          videoWatchingDetails: [],
          quizResults: [],
        };
        setProgress({
          videosCompleted: childProgress.videosCompleted || [],
        });
      }
    } else {
      // No child selected - redirect back to parent dashboard
      router.replace("/dashboard/parent");
    }
  } catch (e) {
    console.warn("Failed to load selected child:", e);
    router.replace("/dashboard/parent");
  }
};
```

### Child Object Structure:
```javascript
{
  id: "timestamp_random",  // Unique child ID
  nickname: "Emma",
  avatarUrl: "file://...",  // Optional local URI
  age: 5,
  parentPhone: "+1234567890",
  learningLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
}
```

### Future (With Backend):
```javascript
// Will fetch child profile from backend using child_id
const response = await api.get(`/children/${child_id}`, {
  headers: { Authorization: `Bearer ${jwtToken}` }
});
// Backend returns full child profile with progress, preferences, etc.
```

---

## 3️⃣ Kid Dashboard Opens

### What Happens:
1. **Component Mount**: `app/dashboard/kids.jsx` component loads
2. **Child Profile Loaded**: 
   - Child profile is loaded using `child_id` from `@selected_child` in AsyncStorage
   - Child-specific progress is loaded using `child_id` from `@app_student_progress_v1`
   - If no child is selected, user is redirected back to parent dashboard
3. **Content Loading**:
   - **Videos**: Loaded from `AsyncStorage` key `"@app_videos_v1"`
   - **Quizzes**: Loaded from `AsyncStorage` key `"@app_quizzes_v1"`
   - **Profile**: Loaded from `AsyncStorage` key `"@app_profile_v1"` (kid's profile photo/name)
   - **Progress**: Loaded from `AsyncStorage` key `"@app_student_progress_v1"` (filtered by child_id)
4. **Dashboard Display**:
   - Shows sections: Lessons, Videos, Quizzes, Progress tracking
   - Displays child's name from selected child profile (`selectedChild.nickname`)
   - Shows progress bars and completion stats specific to the selected child

### Code Locations:
- **Content Loading**: `app/dashboard/kids.jsx` → `useEffect()` (lines 682-697)
- **Profile Loading**: `app/dashboard/kids.jsx` → `loadProfile()` (lines 655-675)
- **Progress Tracking**: `app/dashboard/kids.jsx` → `saveStudentProgress()` (lines 592-621)

### Current Implementation:
```javascript
// kids.jsx - Child Profile Loading (using child_id)
useEffect(() => {
  loadSelectedChild();  // Loads child profile using child_id
}, []);

// kids.jsx - Content Loading
useEffect(() => {
  (async () => {
    try {
      const [rawVideos, rawQuizzes] = await Promise.all([
        AsyncStorage.getItem(STORAGE.VIDEOS),
        AsyncStorage.getItem(STORAGE.QUIZZES),
      ]);
      setVideos(rawVideos ? JSON.parse(rawVideos) : []);
      setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
    } catch (e) {
      console.warn("Failed to load stored content", e);
    } finally {
      setLoading(false);
    }
  })();
}, []);

// All progress is now saved/loaded using child_id
// saveStudentProgress() uses selectedChild.id
// saveVideoWatchingSession() uses selectedChild.id
// submitQuiz() uses selectedChild.id
```

### Progress Tracking (using child_id):
- **Videos Watched**: Stored in `progress.videosCompleted` array (video IDs)
- **Quiz Results**: Stored in `quizzes[quizId].results` array (with childId)
- **Student Progress**: Saved to `@app_student_progress_v1` with structure (keyed by child_id):
  ```javascript
  {
    [child_id]: {  // Uses child_id from selected child
      name: "Emma",
      videosCompleted: ["video1", "video2"],
      videoWatchingDetails: [
        {
          videoId: "video1",
          entryTime: "2024-01-01T10:00:00Z",
          totalDurationMs: 120000
        }
      ],
      quizResults: [
        {
          quizId: "quiz1",
          quizTitle: "Math Quiz",
          score: 85,
          date: "2024-01-01T10:30:00Z"
        }
      ]
    }
  }
  ```

### Future (With Backend):
```javascript
// Will fetch child-specific content and progress
const childId = await AsyncStorage.getItem("@selected_child_id");
const response = await api.get(`/children/${childId}/dashboard`, {
  headers: { Authorization: `Bearer ${jwtToken}` }
});
// Backend returns:
// - Personalized video recommendations
// - Child's progress and achievements
// - Age-appropriate quizzes
// - Learning path based on learningLevel
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PARENT LOGIN                                             │
├─────────────────────────────────────────────────────────────┤
│ Input: email + password                                      │
│   ↓                                                          │
│ Check: AsyncStorage (@app_users) or Backend API              │
│   ↓                                                          │
│ Store: UserContext.login(user)                              │
│ Store: AsyncStorage.setItem("user", user)                   │
│ Store: AsyncStorage.setItem("role", "parent")                │
│   ↓                                                          │
│ Navigate: /dashboard/parent                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PARENT SELECTS CHILD                                      │
├─────────────────────────────────────────────────────────────┤
│ Action: Parent taps child card                              │
│   ↓                                                          │
│ Store: AsyncStorage.setItem("@selected_child", child)       │
│   ↓                                                          │
│ Navigate: router.push("/dashboard/kids")                    │
│   ↓                                                          │
│ App switches to kid mode                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CHILD PROFILE LOADED (using child_id)                    │
├─────────────────────────────────────────────────────────────┤
│ Load: AsyncStorage.getItem("@selected_child")                │
│   ↓                                                          │
│ Extract: child_id from selected child object                │
│   ↓                                                          │
│ Load: Child-specific progress using child_id                │
│   ↓                                                          │
│ Set: selectedChild state with child profile                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. KID DASHBOARD OPENS                                      │
├─────────────────────────────────────────────────────────────┤
│ Load: Videos from @app_videos_v1                            │
│ Load: Quizzes from @app_quizzes_v1                          │
│ Load: Profile from @app_profile_v1                           │
│   ↓                                                          │
│ Display: Dashboard with Lessons, Videos, Quizzes, Progress │
│ Display: Child's name from selectedChild.nickname           │
│   ↓                                                          │
│ Track: Video watching sessions (saved with child_id)        │
│ Track: Quiz completions (saved with child_id)               │
│ Save: Progress updates to AsyncStorage using child_id       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Key Storage Keys

| Key | Purpose | Location |
|-----|---------|----------|
| `"user"` | Current logged-in user (parent) | `login.jsx`, `UserContext.tsx` |
| `"role"` | User role ("parent" or "teacher") | `login.jsx` |
| `"@selected_child"` | Currently selected child object | `parent.jsx` → `kids.jsx` |
| `"@app_children_v1"` | All children by parent ID | `parent.jsx` |
| `"@app_videos_v1"` | All available videos | `kids.jsx`, `teacher.jsx` |
| `"@app_quizzes_v1"` | All available quizzes | `kids.jsx`, `teacher.jsx` |
| `"@app_profile_v1"` | Kid's profile (photo, name) | `kids.jsx` |
| `"@app_student_progress_v1"` | Student progress by student ID | `kids.jsx` |
| `"@app_child_progress_v1"` | Child progress by child ID | `parent.jsx` |

---

## ⚠️ Current Gaps / Future Improvements

1. **JWT Token Integration**: Currently using local storage, should use JWT from backend
2. **Backend API Integration**: All data is local - should fetch from backend using `child_id`
   - Should call: `GET /api/children/{child_id}/profile` to load child profile
   - Should call: `GET /api/children/{child_id}/progress` to load child progress
   - Should call: `GET /api/children/{child_id}/recommendations` for personalized content
3. **Personalization**: Content should be filtered by child's `learningLevel` and `age`
4. **Content Filtering**: Videos and quizzes should be filtered based on child's age and learning level

---

## 🔐 Security Notes

- **Current**: Passwords stored in plain text in AsyncStorage (NOT SECURE - for demo only)
- **Future**: 
  - Passwords should NEVER be stored
  - Use JWT tokens for authentication
  - Store tokens securely (consider using `expo-secure-store`)
  - Backend should handle all authentication

---

## 📚 Related Files

- `app/(drawer)/login.jsx` - Login/signup flow
- `app/dashboard/parent.jsx` - Parent dashboard, child selection
- `app/dashboard/kids.jsx` - Kid dashboard, content display
- `contexts/UserContext.tsx` - User state management
- `src/api.jsx` - API client (configured for JWT but not used yet)

