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

        const { amount, method } = JSON.parse(event.body);
        const withdrawalAmount = Number(amount);

        if (!method || !method.methodName || !method.accountDetails || isNaN(withdrawalAmount) || withdrawalAmount < 50) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request. Minimum withdrawal is 50 BDT.' }) };
        }

        const workerWalletRef = db.collection('wallets').doc(workerId);
        const requestsColRef = db.collection('withdrawalRequests');
        const transactionsColRef = db.collection('transactions');

        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(workerWalletRef);
            if (!walletDoc.exists() || (walletDoc.data().balance || 0) < withdrawalAmount) {
                throw new Error("Insufficient balance for this withdrawal request.");
            }

            transaction.update(workerWalletRef, {
                balance: admin.firestore.FieldValue.increment(-withdrawalAmount),
                escrow: admin.firestore.FieldValue.increment(withdrawalAmount)
            });

            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            const transactionId = transactionsColRef.doc().id;

            transaction.set(requestsColRef.doc(), {
                workerId,
                workerEmail: decodedToken.email,
                amount: withdrawalAmount,
                method: method, // Save the full method object
                status: 'pending',
                requestedAt: timestamp,
                userTransactionId: transactionId
            });

            transaction.set(transactionsColRef.doc(transactionId), {
                userId: workerId,
                amount: -withdrawalAmount,
                type: 'withdrawal',
                description: `Withdrawal request via ${method.methodName}`,
                status: 'pending',
                createdAt: timestamp
            });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Withdrawal request submitted!' }) };

    } catch (error) {
        console.error("Error in requestWithdrawal function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};