// FILE: netlify/functions/approveSubmission.js (FINAL - HANDLES BOTH STATUSES)

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
        const { jobId, submissionId } = JSON.parse(event.body);

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionRef = db.collection('jobs').doc(jobId).collection('submissions').doc(submissionId);

        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const submissionDoc = await transaction.get(submissionRef);

            if (!jobDoc.exists || !submissionDoc.exists) throw new Error("Job or submission not found.");
            if (jobDoc.data().clientId !== clientId) throw new Error("Forbidden: You do not own this job.");
            
            const submissionData = submissionDoc.data();
            const currentStatus = submissionData.status;

            // ✅ THE FIX IS HERE: It now accepts both 'pending' AND 'resubmit_pending' statuses.
            if (currentStatus !== 'pending' && currentStatus !== 'resubmit_pending') {
                throw new Error("This submission cannot be approved from its current state.");
            }

            const jobData = jobDoc.data();
            const workerId = submissionData.workerId;
            const payout = submissionData.payout;
            
            if ((jobData.remainingBudget || 0) < payout) throw new Error("Job budget is insufficient.");

            const workerWalletRef = db.collection('wallets').doc(workerId);
            const clientWalletRef = db.collection('wallets').doc(clientId);
            
            transaction.update(submissionRef, { status: 'approved' });

            // Only decrement pending counter if the status was 'pending'
            if (currentStatus === 'pending') {
                transaction.update(jobRef, {
                    submissionsApproved: admin.firestore.FieldValue.increment(1),
                    submissionsPending: admin.firestore.FieldValue.increment(-1),
                    remainingBudget: admin.firestore.FieldValue.increment(-payout)
                });
            } else { // If status was 'resubmit_pending'
                 transaction.update(jobRef, {
                    submissionsApproved: admin.firestore.FieldValue.increment(1),
                    remainingBudget: admin.firestore.FieldValue.increment(-payout)
                });
            }

            transaction.set(workerWalletRef, {
                balance: admin.firestore.FieldValue.increment(payout),
                totalEarned: admin.firestore.FieldValue.increment(payout)
            }, { merge: true });

            transaction.update(clientWalletRef, {
                escrow: admin.firestore.FieldValue.increment(-payout),
                totalSpent: admin.firestore.FieldValue.increment(payout)
            });

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

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Submission approved.' }) };

    } catch (error) {
        console.error("Error in approveSubmission function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};