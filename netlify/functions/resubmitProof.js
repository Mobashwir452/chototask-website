// FILE: netlify/functions/resubmitProof.js (NEW FILE)

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
        const workerId = decodedToken.uid;

        const { jobId, submissionId, proofs } = JSON.parse(event.body);
        if (!jobId || !submissionId || !proofs || proofs.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionRef = db.collection('jobs').doc(jobId).collection('submissions').doc(submissionId);
        const twelveHoursInMillis = 12 * 60 * 60 * 1000;

        await db.runTransaction(async (transaction) => {
            const subDoc = await transaction.get(submissionRef);

            if (!subDoc.exists) throw new Error("Original submission not found.");
            
            const subData = subDoc.data();
            if (subData.workerId !== workerId) throw new Error("You are not authorized to resubmit this task.");
            if (subData.status !== 'resubmit_pending') throw new Error("This task is not awaiting resubmission.");

            const deadline = subData.rejectionTimestamp.toMillis() + twelveHoursInMillis;
            if (Date.now() > deadline) {
                // If deadline passed, permanently reject it.
                transaction.update(submissionRef, { status: 'rejected' });
                throw new Error("The 12-hour deadline to resubmit has passed.");
            }
            
            // If all checks pass, update the submission
            transaction.update(submissionRef, {
                proofs: proofs,
                status: 'pending', // Set status back to pending for client review
                submittedAt: admin.firestore.FieldValue.serverTimestamp(), // Update submission time
                submissionCount: admin.firestore.FieldValue.increment(1) // Increment submission count
            });
            
            // Put the submission back into the pending queue for the job
            transaction.update(jobRef, {
                submissionsPending: admin.firestore.FieldValue.increment(1)
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Proof resubmitted successfully!' }) };

    } catch (error) {
        console.error("Error in resubmitProof function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};