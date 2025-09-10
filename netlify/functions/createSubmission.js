// FILE: netlify/functions/createSubmission.js (NEW FILE)

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
            const cooldownSeconds = jobData.submissionCooldown || 0;

            // 2. The Cooldown Check
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
            
            // 3. If cooldown check passes, create the submission
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
            
            transaction.set(newSubmissionRef, submissionData);
            transaction.update(jobRef, { submissionsPending: admin.firestore.FieldValue.increment(1) });
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Proof submitted successfully!' }) };

    } catch (error) {
        console.error("Error in createSubmission function:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};