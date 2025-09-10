// FILE: netlify/functions/updateJobBudget.js (NEW FILE)

const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();
const PLATFORM_FEE_PERCENTAGE = 0.10; // Ensure this matches your frontend

exports.handler = async (event, context) => {
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;

        const { jobId, newWorkersNeeded, newCostPerWorker } = JSON.parse(event.body);

        const jobRef = db.collection('jobs').doc(jobId);
        const clientWalletRef = db.collection('wallets').doc(clientId);

        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const walletDoc = await transaction.get(clientWalletRef);

            if (!jobDoc.exists || jobDoc.data().clientId !== clientId) {
                throw new Error("Forbidden or job not found.");
            }
            if (!walletDoc.exists) {
                throw new Error("Client wallet not found.");
            }

            const jobData = jobDoc.data();
            const walletData = walletDoc.data();

            // Calculate cost difference
            const oldTotalCost = jobData.totalCost;
            const newSubtotal = newWorkersNeeded * newCostPerWorker;
            const newTotalCost = newSubtotal + (newSubtotal * PLATFORM_FEE_PERCENTAGE);
            const costDifference = newTotalCost - oldTotalCost;

            if (costDifference > 0) { // Cost Increased
                if (walletData.balance < costDifference) {
                    throw new Error("Insufficient funds to increase job budget.");
                }
                // Move additional funds from balance to escrow
                transaction.update(clientWalletRef, {
                    balance: admin.firestore.FieldValue.increment(-costDifference),
                    escrow: admin.firestore.FieldValue.increment(costDifference)
                });
            } else if (costDifference < 0) { // Cost Decreased
                const refundAmount = Math.abs(costDifference);
                // Move refunded amount from escrow to balance
                transaction.update(clientWalletRef, {
                    balance: admin.firestore.FieldValue.increment(refundAmount),
                    escrow: admin.firestore.FieldValue.increment(-refundAmount)
                });
            }

            // Update the job document
            transaction.update(jobRef, {
                workersNeeded: newWorkersNeeded,
                costPerWorker: newCostPerWorker,
                totalCost: newTotalCost,
                remainingBudget: admin.firestore.FieldValue.increment(costDifference)
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Job budget updated successfully.' }) };

    } catch (error) {
        console.error("Error in updateJobBudget function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};