// FILE: netlify/functions/approveSubmission.js (FINAL & CORRECTED)

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
    // 1. Authenticate the request
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;

        const { jobId, submissionId } = JSON.parse(event.body);
        if (!jobId || !submissionId) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionRef = db.collection('jobs').doc(jobId).collection('submissions').doc(submissionId);

        // 2. Run a secure transaction
        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const submissionDoc = await transaction.get(submissionRef);

            // Security and validation checks
            if (!jobDoc.exists || !submissionDoc.exists) {
                throw new Error("Job or submission not found.");
            }
            if (jobDoc.data().clientId !== clientId) {
                throw new Error("Forbidden: You do not own this job.");
            }
            if (submissionDoc.data().status !== 'pending') {
                throw new Error("This submission has already been processed.");
            }

            const submissionData = submissionDoc.data();
            const workerId = submissionData.workerId;
            const payout = submissionData.payout;
            
            if (!workerId || typeof payout !== 'number' || payout <= 0) {
                throw new Error("Invalid submission data. Cannot process payment.");
            }

            const workerWalletRef = db.collection('wallets').doc(workerId);

            // 3. Perform all database updates
            // a. Update submission status
            transaction.update(submissionRef, { 
                status: 'approved',
                reviewBy: clientId,
                reviewedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // b. Update job counters
            transaction.update(jobRef, {
                submissionsApproved: admin.firestore.FieldValue.increment(1),
                submissionsPending: admin.firestore.FieldValue.increment(-1)
            });

            // ✅ THE FIX IS HERE: Changed transaction.update to transaction.set with { merge: true }
            // This is more robust and ensures the wallet document is created if it doesn't exist.
            transaction.set(workerWalletRef, {
                balance: admin.firestore.FieldValue.increment(payout),
                totalEarned: admin.firestore.FieldValue.increment(payout)
            }, { merge: true });

            // d. Create a transaction log for the worker
            const workerTransactionRef = db.collection('transactions').doc();
            transaction.set(workerTransactionRef, {
                userId: workerId,
                amount: payout,
                type: 'earning',
                description: `Earning from job: ${jobDoc.data().title}`,
                jobId: jobId,
                submissionId: submissionId,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Submission approved and payment processed.' })
        };

    } catch (error) {
        console.error("Error in approveSubmission function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};