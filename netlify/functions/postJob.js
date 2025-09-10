// FILE: netlify/functions/postJob.js (NEW FILE)

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

        const jobData = JSON.parse(event.body);
        const totalCost = jobData.totalCost;

        if (!totalCost || totalCost <= 0) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid total cost.' }) };
        }

        const clientWalletRef = db.collection('wallets').doc(clientId);
        const jobsColRef = db.collection('jobs');

        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(clientWalletRef);
            if (!walletDoc.exists || (walletDoc.data().balance || 0) < totalCost) {
                throw new Error("Insufficient funds. Please deposit money into your wallet.");
            }

            // Move money from available balance to escrow
            transaction.update(clientWalletRef, {
                balance: admin.firestore.FieldValue.increment(-totalCost),
                escrow: admin.firestore.FieldValue.increment(totalCost)
            });

            // Create the new job document
            transaction.set(jobsColRef.doc(), {
                ...jobData,
                clientId: clientId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                // Initialize job-specific budget fields
                remainingBudget: totalCost,
                submissionsPending: 0,
                submissionsApproved: 0,
                submissionsRejected: 0
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Job posted successfully and funds moved to escrow.' }) };

    } catch (error) {
        console.error("Error in postJob function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};