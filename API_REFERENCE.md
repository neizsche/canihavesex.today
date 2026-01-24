# API Reference

**Base URL:** `/api`
**Content-Type:** `application/json`

---

## Authentication

### `GET /auth/oauth/:provider/start`
Initiates the OAuth 2.0 authentication flow.

*   **Auth Required:** No
*   **Path Parameters:**
    *   `provider` (string): The OAuth provider. Currently supports `google`.
*   **Query Parameters:**
    *   `returnTo` (string, optional): URL path to redirect to after successful login. Defaults to `/`.

**Response:**
*   **302 Found:** Redirects to the provider's consent screen.
*   **400 Bad Request:** `{ "error": "Unsupported provider" }`

---

### `GET /auth/oauth/:provider/callback`
Handles the OAuth 2.0 callback from the provider. Exchange code for session.

*   **Auth Required:** No
*   **Path Parameters:**
    *   `provider` (string): `google`.
*   **Query Parameters:**
    *   `code` (string): Authorization code.
    *   `state` (string): CSRF state token.
    *   `error` (string): Error code from provider.

**Response:**
*   **302 Found:** Redirects to the app (or `returnTo` path) with a `uid` cookie set.
*   **302 Found (Error):** Redirects to `/auth?error=...` if authentication fails.

---

### `POST /signout`
Destroys the current user session.

*   **Auth Required:** No

**Response (200 OK):**
```json
{
  "ok": true
}
```

---

### `GET /session`
Retrieves details about the currently authenticated user.

*   **Auth Required:** Yes (via `uid` cookie)

**Response (200 OK):**
```json
{
  "userId": "cuid-123",
  "email": "jane@example.com"
}
```
*   **401 Unauthorized:** If no valid session exists.

---

### `GET /session/check`
Lightweight check to see if the user is authenticated without throwing a 401 error.

*   **Auth Required:** No (Implicit check)

**Response (200 OK):**
```json
{
  "authenticated": true
}
```

---

## Fertility Data

### `POST /log-day`
Logs a daily set of fertility signs and symptoms. This is the primary write endpoint.

*   **Auth Required:** Yes
*   **Stored In:** `raw_logs` (inserted), `normalized_days` (upserted), `engine_results` (inserted).

**Request Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `date` | `string` | Yes | YYYY-MM-DD format. |
| `mucusType` | `string` | Yes | Enum: `dry`, `sticky`, `creamy`, `watery`, `eggwhite` |
| `sensation` | `string` | Yes | Enum: `dry`, `damp`, `slippery` |
| `bleeding` | `string` | Yes | Enum: `none`, `spotting`, `light`, `heavy` |
| `temperature` | `number` | No | Body Basal Temperature (Celsius). |
| `lhTest` | `string` | Yes | Enum: `positive`, `negative`, `notTaken` |
| `sex` | `boolean` | No | True if intercourse occurred. |
| `notes` | `string` | No | Free text notes. |

**Example Request:**
```json
{
  "date": "2024-01-25",
  "mucusType": "eggwhite",
  "sensation": "slippery",
  "bleeding": "none",
  "temperature": 36.4,
  "lhTest": "negative"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "cycleState": "UPDATED",
  "today": {
    "date": "2024-01-25",
    "risk": "HIGH",
    "explanation": "Fertile window open due to mucus."
  }
}
```

---

### `GET /today`
Retrieves the fertility status for the current day ("At A Glance").

*   **Auth Required:** Yes
*   **Reads From:** `engine_results` (latest), `normalized_days` (latest).

**Response (200 OK):**
```json
{
  "date": "2024-01-25",
  "risk": "HIGH",  // HIGH, MEDIUM, LOW
  "explanation": "Predicted fertile window.",
  "disclaimer": "This is not medical advice...",
  "analytics": { ... }
}
```

---

### `GET /chart`
Retrieves aggregated cycle data and daily logs for visualization.

*   **Auth Required:** Yes
*   **Reads From:** `cycles`, `normalized_days`, `engine_results`.

**Response (200 OK):**
```json
{
  "cycle": {
    "id": "uuid",
    "startDate": "2024-01-01",
    "state": "FERTILE_OPEN"
  },
  "days": [
    {
      "date": "2024-01-01",
      "fertilityIndex": 0,
      "risk": "LOW",
      "temperature": 36.2,
      "lhTest": "negative"
    }
  ],
  "analytics": {
    "confidence": 0.95
  }
}
```

---

## Account Management

### `POST /reset-cycle`
Forces the creation of a new cycle starting today, effectively "rebooting" the engine state.

*   **Auth Required:** Yes
*   **Updates:** `cycles` (create new), `raw_logs` (delete future logs), `engine_results` (recompute).

**Response (200 OK):**
```json
{
  "ok": true,
  "today": { ... },
  "chart": { ... }
}
```

---

### `POST /delete-account`
Permanently deletes the user and all associated data. **Irreversible.**

*   **Auth Required:** Yes
*   **Deletes From:** `users`, `raw_logs`, `daily_logs`, `normalized_days`, `engine_results`, `cycles`, `user_identities`.

**Response (200 OK):**
```json
{
  "ok": true
}
```

---

## User Preferences

### `GET /preferences`
Retrieves user UI settings.

*   **Auth Required:** Yes
*   **Reads From:** `user_preferences`.

**Response (200 OK):**
```json
{
  "theme": "dark" // "light" or "dark"
}
```

### `PATCH /preferences`
Updates user UI settings.

*   **Auth Required:** Yes
*   **Updates:** `user_preferences`.

**Request Body:**
```json
{
  "theme": "light"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "theme": "light"
}
```

---

## Onboarding

### `GET /onboarding/status`
Checks if the user has completed the onboarding wizard.

*   **Auth Required:** Yes
*   **Reads From:** `user_preferences`, `cycles`.

**Response (200 OK):**
```json
{
  "completed": false,
  "has_data": false
}
```

### `POST /onboarding/complete`
Submits onboarding responses and initializes the first cycle.

*   **Auth Required:** Yes
*   **updates:** `user_preferences`, `cycles` (create first).

**Request Body:**
```json
{
  "intent": "avoid_pregnancy", // avoid_pregnancy, conceive, understand_cycle
  "cycle_regularity": "regular", // regular, irregular, unsure
  "last_period_start": "2024-01-01", // YYYY-MM-DD
  "context_flags": []
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "today": { ... }
}
```

---

## Waitlist (Public)

### `POST /waitlist`
Adds an email to the waitlist.

*   **Auth Required:** No
*   **Stores In:** `waitlist`.

**Request Body:**
```json
{
  "email": "user@example.com",
  "reason": "interested" // Optional
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Database Schema

Used by the APIs for storage and retrieval.

### `users`
Core identity table.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` | PK | CUID. |
| `email` | `text` | UNIQUE, NOT NULL | Login email. |
| `created_at` | `text` | NOT NULL | ISO Date string. |

### `raw_logs`
Immutable event log. Source of all fertility data.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` | PK | - |
| `user_id` | `text` | FK, NOT NULL | - |
| `date` | `text` | NOT NULL | YYYY-MM-DD. |
| `payload_json` | `text` | NOT NULL | JSON string matching `RawLogPayloadV1`. |
| `source` | `text` | DEFAULT 'app' | - |
| `created_at` | `text` | NOT NULL | - |

### `normalized_days`
Optimized snapshot of the latest state for each day.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` | PK | - |
| `date` | `text` | UNIQUE(user_id, date) | - |
| `temperature` | `real` | - | Body Basal Temp. |
| `mucus_type` | `text` | - | `eggwhite`, `sticky`, etc. |
| `lh_test` | `text` | - | `positive`, `negative`. |
| `cycle_day_index` | `integer` | NOT NULL | 1-based day in cycle. |

### `engine_results`
Computed output logic versioned by engine iteration.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` | PK | - |
| `output_json` | `text` | NOT NULL | Full result JSON (Window, Risk). |
| `as_of_date` | `text` | NOT NULL | Results valid up to this date. |
| `engine_version`| `text` | NOT NULL | e.g. `v2.0`. |

### `cycles`
Tracks menstrual cycles.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `text` | PK | - |
| `start_date` | `text` | NOT NULL | YYYY-MM-DD. |
| `state` | `text` | NOT NULL | `FERTILE_OPEN`, `INFERTILE_POST`, etc. |
| `peak_date` | `text` | - | Calculated peak day. |

### `user_preferences`
UI and onboarding settings.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `text` | PK | - |
| `theme` | `text` | DEFAULT 'dark' | - |
| `onboarding_completed_at` | `text` | - | Date string if complete. |
| `intent` | `text` | - | `avoid_pregnancy` etc. |
