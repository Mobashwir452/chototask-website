// FILE: netlify/functions/updateJobStatus.js (NEW FILE)
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;
        const { jobId, newStatus } = JSON.parse(event.body);

        if (!jobId || !newStatus || !['paused', 'open'].includes(newStatus)) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobDoc = await jobRef.get();

        if (!jobDoc.exists || jobDoc.data().clientId !== clientId) {
            return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Forbidden.' }) };
        }

        await jobRef.update({ status: newStatus });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: `Job status updated to ${newStatus}.` }) };
    } catch (error) {
        console.error("Error in updateJobStatus function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};