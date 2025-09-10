// FILE: netlify/functions/requestResubmission.js (CORRECTED SYNTAX)

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
    // Authentication check using the Bearer Token
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
        
        const jobDoc = await jobRef.get();

        // ✅ THE FIX IS HERE: Changed jobDoc.exists() to jobDoc.exists
        if (!jobDoc.exists || jobDoc.data().clientId !== clientId) {
             return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Forbidden: You do not own this job.' }) };
        }

        // Update the submission document
        await submissionRef.update({
            status: 'resubmit_pending',
            rejectionReason: reason,
            rejectionTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Resubmission requested successfully.' })
        };

    } catch (error) {
        console.error("Error in requestResubmission function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};