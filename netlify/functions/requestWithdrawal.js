// FILE: netlify/functions/requestWithdrawal.js (NEW FILE)

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

        const { amount, methodId } = JSON.parse(event.body);
        const withdrawalAmount = Number(amount);

        if (!methodId || isNaN(withdrawalAmount) || withdrawalAmount < 50) { // Example: Minimum withdrawal 50 BDT
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request. Minimum withdrawal is 50 BDT.' }) };
        }

        const workerRef = db.collection('users').doc(workerId);
        const workerWalletRef = db.collection('wallets').doc(workerId);
        const requestsColRef = db.collection('withdrawalRequests');
        const transactionsColRef = db.collection('transactions');

        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(workerWalletRef);
            const workerDoc = await transaction.get(workerRef);

            if (!walletDoc.exists() || (walletDoc.data().balance || 0) < withdrawalAmount) {
                throw new Error("Insufficient balance for this withdrawal request.");
            }
            if (!workerDoc.exists()) throw new Error("Worker profile not found.");

            const withdrawalMethods = workerDoc.data().withdrawalMethods || [];
            const selectedMethod = withdrawalMethods.find(m => m.id === methodId);

            if (!selectedMethod) {
                throw new Error("The selected withdrawal method was not found on your profile.");
            }

            // Move funds from balance to escrow
            transaction.update(workerWalletRef, {
                balance: admin.firestore.FieldValue.increment(-withdrawalAmount),
                escrow: admin.firestore.FieldValue.increment(withdrawalAmount)
            });

            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            const transactionId = transactionsColRef.doc().id;

            // Create admin-facing withdrawal request
            transaction.set(requestsColRef.doc(), {
                workerId,
                workerEmail: decodedToken.email,
                amount: withdrawalAmount,
                method: selectedMethod,
                status: 'pending',
                requestedAt: timestamp,
                userTransactionId: transactionId
            });

            // Create user-facing transaction log
            transaction.set(transactionsColRef.doc(transactionId), {
                userId: workerId,
                amount: -withdrawalAmount, // Negative because it's a debit
                type: 'withdrawal',
                description: `Withdrawal request via ${selectedMethod.methodName}`,
                status: 'pending',
                createdAt: timestamp
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Withdrawal request submitted successfully!' }) };

    } catch (error) {
        console.error("Error in requestWithdrawal function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};