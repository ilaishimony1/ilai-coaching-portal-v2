# Firebase rules — the live source

These two files are what is deployed to Firebase for the `ilai-portal`
project. They are kept here because rules live only inside Firebase
otherwise: if someone edits them in the console there is no other copy.

- `firestore.rules` — who can read and write the database. The coach
  (ilaishimony1@gmail.com) reaches everything; an athlete reaches only their
  own record plus the shared video catalogue; a signed-out visitor reaches
  only the branding the login screen needs.
- `storage.rules` — only the coach can add, replace or delete video files.
  Anyone can watch, which is how the athlete portal plays them.

Changing the coach address means changing it in three places: here,
`constants.ts`, and `api/set-client-password.ts`.

`NOTES.md` is the state of the app as of 25 Oct 2026.
