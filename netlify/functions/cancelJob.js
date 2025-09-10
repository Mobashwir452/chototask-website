// FILE: netlify/functions/cancelJob.js (NEW FILE)
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
        const { jobId } = JSON.parse(event.body);

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionsColRef = jobRef.collection('submissions');
        const clientWalletRef = db.collection('wallets').doc(clientId);

        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists || jobDoc.data().clientId !== clientId) throw new Error("Forbidden.");
            
            const jobData = jobDoc.data();
            let budgetToRefund = jobData.remainingBudget || 0;
            let autoApprovedCount = 0;

            // Find all pending and resubmit_pending submissions
            const pendingQuery = submissionsColRef.where('status', 'in', ['pending', 'resubmit_pending']);
            const pendingSnapshot = await transaction.get(pendingQuery);

            if (!pendingSnapshot.empty) {
                for (const subDoc of pendingSnapshot.docs) {
                    const subData = subDoc.data();
                    const payout = subData.payout;
                    const workerId = subData.workerId;
                    const workerWalletRef = db.collection('wallets').doc(workerId);
                    
                    // Approve the submission
                    transaction.update(subDoc.ref, { status: 'approved', reviewBy: 'auto-approved (job cancelled)' });
                    
                    // Pay the worker
                    transaction.set(workerWalletRef, {
                        balance: admin.firestore.FieldValue.increment(payout),
                        totalEarned: admin.firestore.FieldValue.increment(payout)
                    }, { merge: true });

                    // This money is now spent, so it won't be refunded
                    budgetToRefund -= payout;
                    autoApprovedCount++;
                }
            }

            // Refund the remaining budget from escrow to client's main balance
            if (budgetToRefund > 0) {
                transaction.update(clientWalletRef, {
                    balance: admin.firestore.FieldValue.increment(budgetToRefund),
                    escrow: admin.firestore.FieldValue.increment(-budgetToRefund)
                });
            }

            // Finally, cancel the job
            transaction.update(jobRef, {
                status: 'cancelled',
                remainingBudget: 0,
                submissionsApproved: admin.firestore.FieldValue.increment(autoApprovedCount),
                submissionsPending: 0
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Job cancelled successfully.' }) };
    } catch (error) {
        console.error("Error in cancelJob function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};