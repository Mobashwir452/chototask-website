// FILE: netlify/functions/auto-approve-submissions.js (UPDATED WITH PAYMENT LOGIC)

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
    // 24 ঘন্টা আগের সময় ঠিক করা
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    try {
        // 'submissions' কালেকশন গ্রুপ থেকে সব 'pending' সাবমিশন সার্চ করা
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
        const promises = []; // সব ট্রানজ্যাকশন একসাথে চালানোর জন্য

        querySnapshot.forEach(submissionDoc => {
            // প্রতিটি সাবমিশনের জন্য আলাদা ট্রানজ্যাকশন চালানো
            
            const transactionPromise = db.runTransaction(async (transaction) => {
                const submissionRef = submissionDoc.ref; // সাবমিশনের রেফারেন্স
                const submissionData = submissionDoc.data();

                const jobRef = db.collection('jobs').doc(submissionData.jobId);
                const jobDoc = await transaction.get(jobRef);
                
                if (!jobDoc.exists) {
                    throw new Error(`Job ${submissionData.jobId} not found.`);
                }
                const jobData = jobDoc.data();
                
                // === approveSubmission.js থেকে কপি করা পেমেন্ট লজিক ===
                
                const workerId = submissionData.workerId;
                const clientId = jobData.clientId; // জব থেকে clientId পেলাম
                const payout = submissionData.payout; // সাবমিশন থেকে payout পেলাম
                
                // বাজেট চেক
                if ((jobData.remainingBudget || 0) < payout) {
                    console.warn(`Skipping submission ${submissionDoc.id}: Insufficient budget.`);
                    return; // এই ট্রানজ্যাকশনটি বাদ দাও
                }

                const workerWalletRef = db.collection('wallets').doc(workerId);
                const clientWalletRef = db.collection('wallets').doc(clientId);

                // 1. সাবমিশন স্ট্যাটাস আপডেট করা
                transaction.update(submissionRef, { 
                    status: 'approved',
                    reviewBy: 'auto-approved by system', // সিস্টেম দিয়ে অ্যাপ্রুভড
                    approvedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // 2. জবের কাউন্টার অ্যাডজাস্ট করা
                transaction.update(jobRef, {
                    submissionsApproved: admin.firestore.FieldValue.increment(1),
                    submissionsPending: admin.firestore.FieldValue.increment(-1),
                    remainingBudget: admin.firestore.FieldValue.increment(-payout)
                });

                // 3. ওয়ার্কারের ওয়ালেটে টাকা অ্যাড করা
                transaction.set(workerWalletRef, {
                    balance: admin.firestore.FieldValue.increment(payout),
                    totalEarned: admin.firestore.FieldValue.increment(payout)
                }, { merge: true });

                // 4. ক্লায়েন্টের ওয়ালেট থেকে টাকা (escrow) কমানো
                transaction.update(clientWalletRef, {
                    escrow: admin.firestore.FieldValue.increment(-payout),
                    totalSpent: admin.firestore.FieldValue.increment(payout)
                });

                // 5. ওয়ার্কারের জন্য ট্রানজ্যাকশন রেকর্ড তৈরি করা
                const workerTransactionRef = db.collection('transactions').doc();
                transaction.set(workerTransactionRef, {
                    userId: workerId,
                    amount: payout,
                    type: 'earning',
                    description: `Earning from job (Auto-Approved): ${jobData.title}`,
                    jobId: submissionData.jobId,
                    submissionId: submissionDoc.id,
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                // === পেমেন্ট লজিক শেষ ===

                approvedCount++; // সফল কাউন্ট
            });
            
            promises.push(transactionPromise);
        });

        // সব ট্রানজ্যাকশন শেষ হওয়ার জন্য অপেক্ষা করা
        await Promise.all(promises);
        
        console.log(`Successfully auto-approved ${approvedCount} submissions.`);
        return { statusCode: 200, body: `Successfully auto-approved ${approvedCount} submissions.` };

    } catch (error) {
        console.error("Error in auto-approve function:", error);
        return { statusCode: 500, body: "An error occurred." };
    }
};