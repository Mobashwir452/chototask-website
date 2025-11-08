// FILE: netlify/functions/createSubmission.js (UPDATED WITH SLOT CHECK)

const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (e) { console.error('Firebase admin init error', e.message); }

const db = admin.firestore();

exports.handler = async (event, context) => {
    // 1. Authenticate the worker
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized.' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const workerId = decodedToken.uid;

        const { jobId, proofs } = JSON.parse(event.body);
        if (!jobId || !proofs || proofs.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields.' }) };
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const submissionsColRef = jobRef.collection('submissions');

        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists) {
                throw new Error("This job no longer exists.");
            }
            const jobData = jobDoc.data();

            
            // ===================================================================
            // === START: RACE CONDITION FIX (নতুন কোডটি এখানে) ===
            // ===================================================================
            // কাউন্টারগুলো পড়ুন (0 fallback সহ)
            const approved = jobData.submissionsApproved || 0;
            const pending = jobData.submissionsPending || 0;
            const needed = jobData.workersNeeded || 0;

            // মূল ভ্যালিডেশন: স্লট কি পূর্ণ?
            if ((approved + pending) >= needed) {
                // যদি জবটি পূর্ণ হয়ে যায়, তবে এরর দিন
                throw new Error("Sorry, this job is already full or no longer accepting submissions.");
            }
            // ===================================================================
            // === END: RACE CONDITION FIX ===
            // ===================================================================


            // 2. The Cooldown Check (আপনার আগের কোড)
            const cooldownSeconds = jobData.submissionCooldown || 0;
            if (cooldownSeconds > 0) {
                const lastSubmissionQuery = submissionsColRef
                    .where('workerId', '==', workerId)
                    .orderBy('submittedAt', 'desc')
                    .limit(1);
                
                const lastSubmissionSnapshot = await transaction.get(lastSubmissionQuery);

                if (!lastSubmissionSnapshot.empty) {
                    const lastSubmissionData = lastSubmissionSnapshot.docs[0].data();
                    const lastSubmitTime = lastSubmissionData.submittedAt.toDate();
                    const now = new Date();
                    const timeDiffSeconds = (now.getTime() - lastSubmitTime.getTime()) / 1000;

                    if (timeDiffSeconds < cooldownSeconds) {
                        const waitTime = Math.ceil(cooldownSeconds - timeDiffSeconds);
                        throw new Error(`Please wait for ${Math.ceil(waitTime / 60)} more minutes before submitting to this job again.`);
                    }
                }
            }
            
            // 3. If slot check and cooldown check passes, create the submission
            const newSubmissionRef = submissionsColRef.doc();
            const submissionData = { 
                workerId: workerId, 
                jobId: jobId, 
                clientId: jobData.clientId,
                jobTitle: jobData.title,
                payout: jobData.costPerWorker,
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending', 
                proofs: proofs,
                submissionCount: 1
            };
            
            // এই দুটি কাজ একসাথে (atomically) হবে
            transaction.set(newSubmissionRef, submissionData);
            transaction.update(jobRef, { submissionsPending: admin.firestore.FieldValue.increment(1) });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Proof submitted successfully!' }) };

    } catch (error) {
        console.error("Error in createSubmission function:", error);
        // আমাদের কাস্টম এররগুলো ওয়ার্কারকে দেখানো হবে
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};