// FILE: /netlify/functions/requestDeposit.js

const admin = require('firebase-admin');

// IMPORTANT: Set this up in your Netlify build environment variables!
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize the Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    // 1. Get the ID token from the request header
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    // 2. Get the form data from the request body
    const { methodName, proofData } = JSON.parse(event.body);

    try {
        // 3. Verify the ID token to get the user's UID
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const clientId = decodedToken.uid;
        const clientEmail = decodedToken.email;

        // 4. Perform the secure database operations (same logic as before)
        const amount = Number(proofData.amount);
        const transactionId = String(proofData.transactionId || '');

        if (isNaN(amount) || amount <= 0 || !transactionId) {
            throw new Error("Invalid amount or transaction ID.");
        }

        const walletRef = db.collection("wallets").doc(clientId);
        const transactionRef = db.collection("transactions").doc();

        const batch = db.batch();

        batch.set(transactionRef, {
            clientId,
            clientEmail,
            amount,
            transactionId,
            methodName,
            status: "unverified",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "deposit"
        });

        batch.set(walletRef, {
            balance: admin.firestore.FieldValue.increment(amount)
        }, { merge: true });

        await batch.commit();

        // 5. Return a success response
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Deposit request successful.' })
        };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};