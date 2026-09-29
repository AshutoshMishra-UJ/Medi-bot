# MediBot — Merge Guide
## How to integrate MediBot with the Main App Backend

---

## When to Merge

Merge MediBot into the main app BE after:
1. MediBot Phase 2 is complete and tested
2. The main app BE has a stable User + Auth system
3. You've confirmed the main app's DB schema doesn't conflict

---

## Step 1 — Copy MediBot Services into Main App Monorepo

```bash
# Copy service apps
cp -r medibot/apps/patient-service   main-app/apps/medibot-patient
cp -r medibot/apps/document-service  main-app/apps/medibot-document

# Copy shared packages (prefix with medibot- to avoid name collisions)
cp -r medibot/packages/types         main-app/packages/medibot-types
cp -r medibot/packages/config        main-app/packages/medibot-config

# Copy Python NER service
cp -r medibot/services/ner-service   main-app/services/medibot-ner
```

---

## Step 2 — Merge Prisma Schema

Copy all MediBot models from `medibot/prisma/schema.prisma` into the main app's `schema.prisma`.

**IMPORTANT:** Replace the MediBot `User` model with a relation to the main app's existing User:

```prisma
// BEFORE (MediBot standalone):
model User {
  userId       String   @id @default(uuid()) @map("user_id")
  email        String   @unique
  passwordHash String   @map("password_hash")
  ...
}

// AFTER (merged — link to main app User):
// DELETE the MediBot User model entirely.
// On PatientProfile, change the @relation to point to main app's User:
model PatientProfile {
  patientId String @id @default(uuid()) @map("patient_id")
  userId    String @unique @map("user_id")  // ← this is now main app's user ID
  ...
  // Remove the User @relation line if main app uses a different model name
}
```

Run `prisma migrate dev --name add_medibot_models` to apply.

---

## Step 3 — Swap Auth Middleware

Replace `apps/api-gateway/src/middleware/auth.ts` logic with the main app's JWT validation:

```typescript
// Replace this in patient-service and document-service request handlers:
const userId = (req as any).user?.userId;

// With whatever the main app's auth middleware attaches:
const userId = req.auth?.sub;  // or req.user?.id — depends on main app
```

---

## Step 4 — Mount MediBot Routes in Main App Router

In the main app's Express router:

```typescript
import { patientRouter }  from '@main-app/medibot-patient';
import { documentRouter } from '@main-app/medibot-document';

// Mount under /medibot namespace to avoid route conflicts
app.use('/medibot/patients',   authMiddleware, patientRouter);
app.use('/medibot/documents',  authMiddleware, documentRouter);
app.use('/medibot/encounters', authMiddleware, encounterRouter);
```

---

## Step 5 — Retire the MediBot API Gateway

Once routes are mounted in the main app:
- Remove `apps/api-gateway` from MediBot
- The main app's auth + rate-limit + audit middleware handles everything

---

## Step 6 — Update Environment Variables

Add MediBot env vars to the main app's `.env`:
```env
NER_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads/medibot
CONFIDENCE_AUTO_COMMIT=0.85
CONFIDENCE_USER_CONFIRM=0.60
```


---

## What Does NOT Change

- The Prisma schema models (Patient 360, Encounters, SymptomState, etc.)
- The Python NER service (runs independently on port 8000)
- The in-memory job queue logic (or swap to your own queue)
- The AI Integration Contracts (encounter routes, symptom-state, context endpoint)
- The Provenance append-only rule

---

## Checklist After Merge

- [ ] `prisma migrate dev` runs cleanly with merged schema
- [ ] All MediBot routes accessible under `/medibot/*`
- [ ] Auth middleware correctly extracts `userId` from main app JWT
- [ ] Consent records created for existing users
- [ ] NER service health check passing: `GET http://localhost:8000/health`
- [ ] Document upload working with main app auth
- [ ] Patient 360 data isolated per user (cross-user isolation test)
