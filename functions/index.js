// FILE: /functions/index.js (FINAL CORRECTED VERSION)

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.requestDeposit = functions.runWith({ region: "asia-south1" }).https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated", 
            "You must be logged in to make a deposit request."
        );
    }

    const clientId = context.auth.uid;
    // FIX 1: Access the data from the nested 'proofData' object
    const proofData = data.proofData || {};
    const amount = Number(proofData.amount);
    const transactionId = String(proofData.transactionId || '');

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

        const batch = db.batch();

        // Create a new transaction document
        batch.set(transactionRef, {
            clientId: clientId,
            amount: amount,
            transactionId: transactionId,
            methodName: data.methodName || 'Unknown',
            status: "unverified",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "deposit"
        });

        // FIX 2: Use set with { merge: true } to safely create or update the wallet
        batch.set(walletRef, {
            balance: admin.firestore.FieldValue.increment(amount)
        }, { merge: true });

        // Commit the batch
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