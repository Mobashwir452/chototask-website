// /netlify/functions/requestDeposit.js - FINAL VERSION

const admin = require('firebase-admin');

// IMPORTANT: Set this up in your Netlify build environment variables!
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;
        const clientEmail = decodedToken.email;

        const { methodName, proofData } = JSON.parse(event.body);
        const amount = Number(proofData.amount);

        if (isNaN(amount) || amount < 100 || amount > 10000) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid amount. Must be between 100 and 10,000 BDT." }) };
        }

        const depositRequestsRef = db.collection("depositRequests");
        const walletRef = db.collection("wallets").doc(clientId);
        const transactionsRef = db.collection("transactions");

        await db.runTransaction(async (transaction) => {
            const pendingRequestsQuery = depositRequestsRef.where('clientId', '==', clientId).where('status', '==', 'pending');
            const pendingRequestsSnapshot = await transaction.get(pendingRequestsQuery);

            if (!pendingRequestsSnapshot.empty) {
                throw new Error('You already have a deposit request pending approval.');
            }
            
            // Create a reference for the new user-facing transaction log
            const newTransactionRef = transactionsRef.doc();

            // 1. Create the user-facing transaction history entry
            transaction.set(newTransactionRef, {
                clientId: clientId,
                amount: amount,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                description: `${methodName} Deposit (Pending)`,
                methodName: methodName,
                status: 'pending',
                type: 'deposit'
            });

            // 2. Create the admin's deposit request, now linked to the transaction
            const newRequestRef = depositRequestsRef.doc();
            transaction.set(newRequestRef, {
                clientId,
                clientEmail,
                amount,
                transactionId: String(proofData.transactionId || ''),
                userTransactionId: newTransactionRef.id, // ✅ Link to history item
                methodName,
                status: "pending",
                requestedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 3. Instantly update the user's wallet balance
            transaction.set(walletRef, {
                balance: admin.firestore.FieldValue.increment(amount)
            }, { merge: true });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Deposit request successful and pending approval.' })
        };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};