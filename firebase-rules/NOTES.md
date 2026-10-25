# Coaching portal — where things stand (25 Oct 2026)

Everything below is LIVE and verified on the real site.

## Videos
- The Google billing account behind the project had closed, which locked every
  video (HTTP 402). Card is back on (Blaze, ₪5/month alert). 261/261 files play.

## Security
- Storage: only the signed-in coach can upload, replace or delete files.
- Database: strangers get 403 on everything except the branding the login
  screen needs. Verified from outside.
- Athletes now load ONLY their own record. An athlete querying the whole
  client list gets 403; querying their own record works.
- Stored passwords deleted from all 4 athlete records; new ones are never saved.

## Bugs fixed today
1. Coach dashboard went blank on login (caused by the data-loading change).
2. Logout never actually logged you out — a reload put you straight back in.
3. Athlete photos: saved at full size, always failed the 1 MB record limit.
   Now scaled to 400px first.
4. No error boundary — any crash was a blank screen. Added one with a reload button.
5. Athletes were signed out after 1 hour. Now a month, clock restarts on return.
6. Error popups showed raw technical text. Rewritten in plain words.
7. Deleted 9 screens nothing imported (chat, an AI assistant never wired up,
   an old uploader, a Firebase test page) + the orphaned AI service.
   Type errors went 46 -> 19.

## Password change — FIXED and proven
- api/set-client-password changes the real Firebase login. Only the coach can
  call it (checked against the caller's own token). The coach screen calls it
  when a password is typed for an athlete who already has a login, behind a
  confirm.
- Proven end to end on the live site: before the call the new password was
  rejected and the old one worked; after it, the reverse.
- Server credential: FIREBASE_SERVICE_ACCOUNT_JSON on Vercel (all 3 envs),
  using the project's firebase-adminsdk service account key b343cf64...
  Do not delete that key — the endpoint stops working.

## Known, NOT fixed
- 19 type errors remain in live files. None are crashes; mostly loose prop types.
- Any signed-in athlete can still read the shared video catalogue (by design).

## Useful paths
- Rules backup (pre-change): <scratchpad>/rules-backup/LIVE-rules-before-change.txt
- Current rules source:      <scratchpad>/rules-new/firestore.PERCLIENT.rules
- Deploy rules:              python3 -I <scratchpad>/deploy.py <scratchpad>/rules-new
- Rules tests:               python3 -I <scratchpad>/test_fs3.py <rules file>
