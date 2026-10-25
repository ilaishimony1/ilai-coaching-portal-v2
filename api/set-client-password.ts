import * as admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COACH_EMAIL = 'ilaishimony1@gmail.com';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
    ),
  });
}

/**
 * Changes an existing athlete's login password.
 *
 * The browser cannot do this: the Firebase client SDK can only change the
 * password of whoever is currently signed in. Before this existed, typing a
 * new password in the coach screen only stored text and the real login never
 * changed.
 *
 * Only the coach can call it, checked against the signed-in account's own
 * token rather than anything the caller sends.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  let caller: admin.auth.DecodedIdToken;
  try {
    caller = await admin.auth().verifyIdToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ error: 'Session expired — sign in again' });
  }

  if (caller.email !== COACH_EMAIL) {
    return res.status(403).json({ error: 'Only the coach can do that' });
  }

  const { authUid, email, password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    let uid = typeof authUid === 'string' && authUid ? authUid : null;
    if (!uid) {
      if (typeof email !== 'string' || !email) {
        return res.status(400).json({ error: 'Need the athlete to identify them' });
      }
      uid = (await admin.auth().getUserByEmail(email)).uid;
    }

    await admin.auth().updateUser(uid, { password });
    return res.status(200).json({ ok: true, authUid: uid });
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'That athlete has no login yet' });
    }
    console.error('set-client-password failed:', err);
    return res.status(500).json({ error: 'Could not change the password' });
  }
}
