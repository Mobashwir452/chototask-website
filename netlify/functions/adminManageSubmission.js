// FILE: netlify/functions/adminManageSubmission.js (FINAL & CORRECTED)
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();

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

        const { jobId, submissionId, action } = JSON.parse(event.body);
        if (!jobId || !submissionId || !['approve', 'reject'].includes(action)) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionRef = jobRef.collection('submissions').doc(submissionId);

        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const submissionDoc = await transaction.get(submissionRef);

            if (!jobDoc.exists || !submissionDoc.exists) throw new Error("Job or submission not found.");
            
            const subData = submissionDoc.data();
            const jobData = jobDoc.data();
            const workerId = subData.workerId;
            const clientId = jobData.clientId;
            const payout = subData.payout;
            const originalStatus = subData.status;

            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            transaction.update(submissionRef, { status: newStatus });

            if (action === 'approve' && originalStatus !== 'approved') {
                if ((jobData.remainingBudget || 0) < payout) throw new Error("Job budget is insufficient.");
                
                const workerWalletRef = db.collection('wallets').doc(workerId);
                const clientWalletRef = db.collection('wallets').doc(clientId);

                transaction.set(workerWalletRef, {
                    balance: admin.firestore.FieldValue.increment(payout),
                    totalEarned: admin.firestore.FieldValue.increment(payout)
                }, { merge: true });

                transaction.update(clientWalletRef, {
                    escrow: admin.firestore.FieldValue.increment(-payout),
                    totalSpent: admin.firestore.FieldValue.increment(payout)
                });
                
                let counterUpdates = {
                    submissionsApproved: admin.firestore.FieldValue.increment(1),
                    remainingBudget: admin.firestore.FieldValue.increment(-payout)
                };
                if (originalStatus === 'pending') {
                    counterUpdates.submissionsPending = admin.firestore.FieldValue.increment(-1);
                }
                transaction.update(jobRef, counterUpdates);

            } else if (action === 'reject' && originalStatus !== 'rejected') {
                let counterUpdates = {
                    submissionsRejected: admin.firestore.FieldValue.increment(1)
                };
                if (originalStatus === 'pending') {
                    counterUpdates.submissionsPending = admin.firestore.FieldValue.increment(-1);
                    // ✅ THE FIX IS HERE: Refund the budget for the rejected slot
                    counterUpdates.remainingBudget = admin.firestore.FieldValue.increment(payout);
                } else if (originalStatus === 'resubmit_pending') {
                    // For resubmit_pending, the pending counter is not touched, but budget is still refunded.
                    counterUpdates.remainingBudget = admin.firestore.FieldValue.increment(payout);
                }
                transaction.update(jobRef, counterUpdates);
            }
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: `Submission ${action}ed successfully.` }) };
    } catch (error) {
        console.error("Error in adminManageSubmission function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};