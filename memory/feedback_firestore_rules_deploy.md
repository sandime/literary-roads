---
name: Remind to deploy Firestore rules
description: User forgets to deploy firestore.rules after changes — always remind them
type: feedback
---

After every edit to `firestore.rules`, end the response with a reminder to deploy:

```
firebase deploy --only firestore:rules
```

**Why:** User forgets to do this step and the rules changes don't take effect in production until deployed.

**How to apply:** Any time I edit `firestore.rules`, include the deploy command in my closing message — even if I already mentioned it once during the session.
