# Setting Up Firebase Custom Claims for User Roles

This system uses Firebase Authentication Custom Claims to manage user roles. Custom Claims provide a secure way to store role information that cannot be manipulated by the client.

## Required Firebase Cloud Functions

You need to create the following Cloud Functions in your Firebase project:

### 1. Function to Set User Role (Admin Only)

Create this function in your Firebase Functions:

\`\`\`typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const setUserRole = functions.https.onCall(async (data, context) => {
  // Check if requester is authenticated and is admin_master
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const requesterToken = await admin.auth().getUser(context.auth.uid)
  const requesterRole = requesterToken.customClaims?.role
  
  if (requesterRole !== 'admin_master') {
    throw new functions.https.HttpsError('permission-denied', 'Only admin_master can set roles')
  }
  
  const { uid, role } = data
  
  // Validate role
  if (!['aluno', 'admin_master', 'admin_questoes'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role')
  }
  
  // Set custom claim
  await admin.auth().setCustomUserClaims(uid, { role })
  
  // Also update Firestore document
  await admin.firestore().collection('users').doc(uid).update({ 
    role,
    roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return { success: true, message: `Role ${role} set for user ${uid}` }
})
\`\`\`

### 2. Function to Set Default Role on User Creation

\`\`\`typescript
export const setDefaultRole = functions.auth.user().onCreate(async (user) => {
  // Set default role as 'aluno' for all new users
  await admin.auth().setCustomUserClaims(user.uid, { role: 'aluno' })
  
  console.log(`Default role 'aluno' set for new user ${user.uid}`)
})
\`\`\`

## How to Deploy

1. Install Firebase CLI: \`npm install -g firebase-tools\`
2. Login: \`firebase login\`
3. Initialize Functions: \`firebase init functions\`
4. Add the functions above to \`functions/src/index.ts\`
5. Deploy: \`firebase deploy --only functions\`

## Setting the First Admin Master

To set your first admin_master user, you'll need to use the Firebase Admin SDK directly or run a one-time script:

\`\`\`typescript
// one-time-setup.ts
import * as admin from 'firebase-admin'

admin.initializeApp()

async function setFirstAdmin(email: string) {
  const user = await admin.auth().getUserByEmail(email)
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin_master' })
  await admin.firestore().collection('users').doc(user.uid).update({ role: 'admin_master' })
  console.log('First admin master set!')
}

setFirstAdmin('your-admin-email@example.com')
\`\`\`

## How It Works

1. **User Registration**: New users are created with default role 'aluno' in Firestore and Custom Claims
2. **Role Check**: The app reads the role from Custom Claims (secure, server-side)
3. **Role Update**: Only admin_master can update roles via Cloud Function
4. **Token Refresh**: After role change, user needs to refresh their token: \`user.getIdToken(true)\`

## Testing Roles

You can test different roles by:
1. Creating a user
2. Using Firebase Console to manually set Custom Claims (for testing)
3. Or calling the Cloud Function from your admin panel
