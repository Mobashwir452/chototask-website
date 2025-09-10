// FILE: netlify/functions/requestResubmission.js

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
    // Authenticate user
    if (!context.clientContext || !context.clientContext.user) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }
    
    try {
        const { jobId, submissionId, reason } = JSON.parse(event.body);

        if (!jobId || !submissionId || !reason) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields.' }) };
        }

        const submissionRef = db.collection('jobs').doc(jobId).collection('submissions').doc(submissionId);
        
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