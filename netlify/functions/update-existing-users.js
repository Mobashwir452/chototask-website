// === FILE: netlify/functions/update-existing-users.js ===

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Ensure your Netlify environment variables are set for these
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Simple security check to prevent unauthorized runs
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

      // Check for each new field and add if it's missing
      if (!userData.photoURL) {
        dataToUpdate.photoURL = "";
      }
      if (!userData.country) {
        dataToUpdate.country = "";
      }
      if (!userData.aboutMe) {
        dataToUpdate.aboutMe = "";
      }
      // Use createdAt if memberSince is missing
      if (!userData.memberSince) {
        dataToUpdate.memberSince = userData.createdAt || admin.firestore.FieldValue.serverTimestamp();
      }
      // Check if the stats object is missing
      if (!userData.stats) {
        dataToUpdate.stats = {
          jobsPosted: 0,
          totalSpent: 0,
          approvalRate: 100,
          rating: 0,
          reviewCount: 0,
        };
      }

      // If there are fields to update for this user, add to batch
      if (Object.keys(dataToUpdate).length > 0) {
        batch.update(doc.ref, dataToUpdate);
        updatedCount++;
      }
    });

    // Commit all the updates at once
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