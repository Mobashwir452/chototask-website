// FILE: netlify/functions/adminBanUser.js (NEW FILE)
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();

// Helper function to check for admin status
async function isAdmin(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data().isAdmin === true;
}

exports.handler = async (event, context) => {
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (!await isAdmin(decodedToken.uid)) {
            return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Forbidden. Not an admin.' }) };
        }

        const { userIdToBan } = JSON.parse(event.body);
        if (!userIdToBan) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'User ID to ban is required.' }) };
        }

        // Disable the user in Firebase Auth
        await admin.auth().updateUser(userIdToBan, { disabled: true });

        // Mark the user as banned in Firestore
        await db.collection('users').doc(userIdToBan).update({ status: 'banned' });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: `User ${userIdToBan} has been banned.` }) };
    } catch (error) {
        console.error("Error in adminBanUser function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};