const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
    // 1. Authenticate the request: Ensure it's from a logged-in user
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }
    const idToken = event.headers.authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // 2. Check if the user is an admin (Security Check)
        const adminUserDoc = await db.collection('users').doc(adminUid).get();
        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
            return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Forbidden: Not an admin.' }) };
        }

        // 3. Get the ticketId from the request body
        const { ticketId } = JSON.parse(event.body);
        if (!ticketId) {
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing ticketId.' }) };
        }
        
        // 4. Fetch the parent ticket to find its owner
        const ticketRef = db.collection('supportTickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        if (!ticketDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Ticket not found.' }) };
        }

        const ticketData = ticketDoc.data();
        const ticketOwnerId = ticketData.userId;
        const userRole = ticketData.userRole || 'client';

        // 5. Create the activity log for the ticket owner
        const message = `An admin has replied to your ticket: "${ticketData.subject}"`;
        const refLink = `/${userRole}/ticket-details.html?id=${ticketId}`;

        await db.collection('activities').add({
            userId: ticketOwnerId,
            userRole: userRole,
            type: 'TICKET_REPLY_ADMIN',
            message: message,
            refId: ticketId,
            refLink: refLink,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Notification created successfully.' })
        };

    } catch (error) {
        console.error("Error in createReplyNotification function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};