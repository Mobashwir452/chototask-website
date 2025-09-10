// FILE: netlify/functions/auto-approve-submissions.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.message);
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    console.log("Running auto-approve submissions function...");

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    try {
        const submissionsRef = db.collectionGroup('submissions');
        const querySnapshot = await submissionsRef
            .where('status', '==', 'pending')
            .where('submittedAt', '<=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
            .get();

        if (querySnapshot.empty) {
            console.log("No submissions to auto-approve.");
            return { statusCode: 200, body: "No submissions to auto-approve." };
        }

        let approvedCount = 0;
        const promises = [];

        querySnapshot.forEach(doc => {
            approvedCount++;
            const submission = doc.data();
            const jobRef = db.collection('jobs').doc(submission.jobId);
            
            const transactionPromise = db.runTransaction(async (transaction) => {
                transaction.update(doc.ref, { 
                    status: 'approved',
                    reviewBy: 'auto-approved by system'
                });
                transaction.update(jobRef, {
                    submissionsApproved: admin.firestore.FieldValue.increment(1),
                    submissionsPending: admin.firestore.FieldValue.increment(-1)
                });
                // Here you would also add logic to transfer funds to the worker's wallet
            });
            promises.push(transactionPromise);
        });

        await Promise.all(promises);
        console.log(`Successfully auto-approved ${approvedCount} submissions.`);
        return { statusCode: 200, body: `Successfully auto-approved ${approvedCount} submissions.` };

    } catch (error) {
        console.error("Error in auto-approve function:", error);
        return { statusCode: 500, body: "An error occurred." };
    }
};