// FILE: /functions/index.js (for Firebase Functions)

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.requestDeposit = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check: Ensure user is logged in.
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated", 
            "You must be logged in to make a deposit request."
        );
    }

    const clientId = context.auth.uid;
    const amount = Number(data.amount);
    const transactionId = String(data.transactionId);

    // 2. Data Validation
    if (isNaN(amount) || amount <= 0 || !transactionId) {
        throw new functions.https.HttpsError(
            "invalid-argument", 
            "Please provide a valid amount and transaction ID."
        );
    }

    try {
        const transactionRef = db.collection("transactions").doc();
        const walletRef = db.collection("wallets").doc(clientId);

        // 3. Use a batched write to perform both actions atomically
        const batch = db.batch();

        // Action A: Create a new transaction document
        batch.set(transactionRef, {
            clientId: clientId,
            amount: amount,
            transactionId: transactionId,
            status: "unverified", // Mark as unverified
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "deposit"
        });

        // Action B: Increment the user's wallet balance
        batch.update(walletRef, {
            balance: admin.firestore.FieldValue.increment(amount)
        });

        // 4. Commit the batch
        await batch.commit();

        return { success: true, message: "Deposit request successful." };

    } catch (error) {
        console.error("Error in requestDeposit function:", error);
        throw new functions.https.HttpsError(
            "internal", 
            "An error occurred while processing your request."
        );
    }
});