// === FILE: netlify/functions/update-existing-users.js (CORRECTED) ===

const admin = require('firebase-admin');

// --- NEW INITIALIZATION LOGIC ---
// This will now parse the single environment variable
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.stack);
}
// --- END OF NEW LOGIC ---

const db = admin.firestore();

exports.handler = async (event, context) => {
  const { secret } = event.queryStringParameters;
  if (secret !== process.env.MIGRATION_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return { statusCode: 200, body: 'No users found to update.' };
    }

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const userData = doc.data();
      const dataToUpdate = {};

      if (userData.photoURL === undefined) { dataToUpdate.photoURL = ""; }
      if (userData.country === undefined) { dataToUpdate.country = ""; }
      if (userData.aboutMe === undefined) { dataToUpdate.aboutMe = ""; }
      if (!userData.memberSince) { dataToUpdate.memberSince = userData.createdAt || admin.firestore.FieldValue.serverTimestamp(); }
      if (!userData.stats) {
        dataToUpdate.stats = {
          jobsPosted: 0,
          totalSpent: 0,
          approvalRate: 100,
          rating: 0,
          reviewCount: 0,
        };
      }

      if (Object.keys(dataToUpdate).length > 0) {
        batch.update(doc.ref, dataToUpdate);
        updatedCount++;
      }
    });

    await batch.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Migration complete. Successfully updated ${updatedCount} user profiles.` }),
    };

  } catch (error) {
    console.error('Error during user migration:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update user profiles.' }),
    };
  }
};