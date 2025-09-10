// FILE: netlify/functions/requestResubmission.js (FINAL WITH COUNTER FIX)

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized: No token provided.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;

        const { jobId, submissionId, reason } = JSON.parse(event.body);

        if (!jobId || !submissionId || !reason) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionRef = db.collection('jobs').doc(jobId).collection('submissions').doc(submissionId);
        
        // ✅ THE FIX IS HERE: Using a transaction to update both documents at once.
        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists || jobDoc.data().clientId !== clientId) {
                throw new Error('Forbidden: You do not own this job.');
            }

            // 1. Update the submission document
            transaction.update(submissionRef, {
                status: 'resubmit_pending',
                rejectionReason: reason,
                rejectionTimestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Decrement the pending counter on the main job document
            transaction.update(jobRef, {
                submissionsPending: admin.firestore.FieldValue.increment(-1)
            });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Resubmission requested successfully.' })
        };

    } catch (error) {
        console.error("Error in requestResubmission function:", error);
        // If the error is our custom "Forbidden" error, send a 403 status code
        if (error.message.startsWith('Forbidden')) {
            return { statusCode: 403, body: JSON.stringify({ success: false, error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};