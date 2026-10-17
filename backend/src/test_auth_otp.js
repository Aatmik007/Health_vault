import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from './models/User.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('====================================================');
  console.log(' HEALTHVAULT AUTH & OTP EMAIL VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthvault');
  console.log('✓ Connected to MongoDB directly for DB validation');

  const testEmail = `test_vault_${Date.now()}@healthvault.local`;
  const testPassword = 'StrongPassword123!';
  const testName = 'Dr. Test Physician';
  let passedCount = 0;
  let totalTests = 0;

  const assert = (condition, description) => {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      throw new Error(`Test assertion failed: ${description}`);
    }
  };

  try {
    // ----------------------------------------------------
    // Test 1: Validation - Reject short password (< 8 chars)
    // ----------------------------------------------------
    console.log('\n--- Test 1: Password Validation (< 8 chars) ---');
    const shortPassRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: '123' }),
    });
    const shortPassData = await shortPassRes.json();
    assert(shortPassRes.status === 400, 'Rejects password shorter than 8 characters (400)');
    assert(shortPassData.message.includes('8 characters'), 'Returns explicit error message about 8 characters');

    // ----------------------------------------------------
    // Test 2: Validation - Reject malformed email
    // ----------------------------------------------------
    console.log('\n--- Test 2: Email Validation ---');
    const badEmailRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: 'not-an-email', password: testPassword }),
    });
    const badEmailData = await badEmailRes.json();
    assert(badEmailRes.status === 400, 'Rejects invalid email format (400)');

    // ----------------------------------------------------
    // Test 3: Successful Registration
    // ----------------------------------------------------
    console.log('\n--- Test 3: Valid Registration Flow ---');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns 201 Created');
    assert(regData.success === true, 'Response indicates success: true');
    assert(regData.requiresVerification === true, 'Response sets requiresVerification: true');
    assert(!regData.token, 'Registration DOES NOT leak or return a JWT token before email verification');
    assert(!regData.otp, 'Registration DOES NOT leak plaintext OTP in response');

    // Verify DB state
    const dbUser = await User.findOne({ email: testEmail });
    assert(dbUser !== null, 'User document created in MongoDB');
    assert(dbUser.emailVerified === false, 'User emailVerified is initially false');
    assert(dbUser.emailVerificationOtpHash.length === 64, 'OTP is stored as SHA-256 hash (64 hex characters)');
    assert(dbUser.emailVerificationOtpExpiresAt > new Date(), 'OTP expiration timestamp is in the future (~10m)');

    // ----------------------------------------------------
    // Test 4: Unverified User Login Blocked
    // ----------------------------------------------------
    console.log('\n--- Test 4: Unverified User Login Attempt ---');
    const unverifiedLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const unverifiedLoginData = await unverifiedLoginRes.json();
    assert(unverifiedLoginRes.status === 403, 'Unverified user login returns 403 Forbidden');
    assert(unverifiedLoginData.isUnverified === true, 'Response includes isUnverified: true flag for UI redirect');
    assert(!unverifiedLoginData.token, 'No JWT token issued to unverified user');

    // ----------------------------------------------------
    // Test 5: Protected Route Access Blocked For Unverified User
    // ----------------------------------------------------
    console.log('\n--- Test 5: Protected Route Block For Unverified Users ---');
    // If an attacker somehow forged a token with user._id, verify authMiddleware blocks them
    const jwt = (await import('jsonwebtoken')).default;
    const fakeToken = jwt.sign({ id: dbUser._id }, process.env.JWT_SECRET || 'healthvault_jwt_secret_dev_key_2026', { expiresIn: '1h' });
    const protectedRes = await fetch(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    const protectedData = await protectedRes.json();
    assert(protectedRes.status === 403, 'authMiddleware returns 403 Forbidden for unverified accounts');
    assert(protectedData.message.includes('not verified'), 'Returns message requiring email verification to access medical records');

    // ----------------------------------------------------
    // Test 6: Verify Invalid OTP Formats
    // ----------------------------------------------------
    console.log('\n--- Test 6: Invalid OTP Format ---');
    const shortOtpRes = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '123' }),
    });
    assert(shortOtpRes.status === 400, 'Rejects OTP shorter than 6 digits (400)');

    // ----------------------------------------------------
    // Test 7: Verify Incorrect 6-Digit OTP & Decrement Attempts
    // ----------------------------------------------------
    console.log('\n--- Test 7: Incorrect 6-Digit OTP ---');
    const wrongOtpRes = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '999999' }),
    });
    const wrongOtpData = await wrongOtpRes.json();
    assert(wrongOtpRes.status === 400, 'Rejects incorrect OTP with 400 Bad Request');
    assert(wrongOtpData.message.includes('attempt(s) remaining'), 'Returns remaining attempts count');
    const updatedUser = await User.findOne({ email: testEmail });
    assert(updatedUser.emailVerificationAttempts === 1, 'emailVerificationAttempts incremented to 1 in DB');

    // ----------------------------------------------------
    // Test 8: Rate-limit Cooldown on Resend OTP (< 60s)
    // ----------------------------------------------------
    console.log('\n--- Test 8: Resend Cooldown Enforcement ---');
    const cooldownRes = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const cooldownData = await cooldownRes.json();
    assert(cooldownRes.status === 429, 'Rejects resend request within 60s cooldown with 429');
    assert(cooldownData.message.includes('seconds'), 'Mentions seconds remaining in cooldown response');

    // ----------------------------------------------------
    // Test 9: Expired OTP Rejection
    // ----------------------------------------------------
    console.log('\n--- Test 9: Expired OTP Rejection ---');
    // Set expiry to 1 minute ago in DB to test expiry enforcement
    await User.updateOne({ email: testEmail }, { emailVerificationOtpExpiresAt: new Date(Date.now() - 60000) });
    const expiredRes = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '123456' }),
    });
    const expiredData = await expiredRes.json();
    assert(expiredRes.status === 400, 'Rejects expired OTP with 400');
    assert(expiredData.message.includes('expired'), 'Response message indicates code has expired');

    // ----------------------------------------------------
    // Test 10: Attempt Limit Lockout (5 attempts)
    // ----------------------------------------------------
    console.log('\n--- Test 10: Max Attempts Lockout ---');
    // Set attempts to 5 and reset expiry for this test
    await User.updateOne(
      { email: testEmail },
      { emailVerificationAttempts: 5, emailVerificationOtpExpiresAt: new Date(Date.now() + 600000) }
    );
    const lockoutRes = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '123456' }),
    });
    const lockoutData = await lockoutRes.json();
    assert(lockoutRes.status === 400, 'Rejects verification when max attempts exceeded (400)');
    assert(lockoutData.message.includes('Maximum verification attempts exceeded'), 'Clear lockout error message returned');

    // ----------------------------------------------------
    // Test 11: Resend OTP After Cooldown Resets Attempts
    // ----------------------------------------------------
    console.log('\n--- Test 11: Resend OTP After Cooldown ---');
    // Simulate cooldown elapsed by setting emailVerificationLastSentAt to 70s ago
    await User.updateOne(
      { email: testEmail },
      { emailVerificationLastSentAt: new Date(Date.now() - 70000) }
    );
    const validResendRes = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert(validResendRes.status === 200, 'Resend succeeds after 60s cooldown with 200 OK');
    const userAfterResend = await User.findOne({ email: testEmail });
    assert(userAfterResend.emailVerificationAttempts === 0, 'Resend resets verification attempts counter to 0');

    // ----------------------------------------------------
    // Test 12: Successful OTP Verification & Account Activation
    // ----------------------------------------------------
    console.log('\n--- Test 12: Successful OTP Verification ---');
    // Set a known OTP in DB
    const knownOtp = '582914';
    await User.updateOne(
      { email: testEmail },
      {
        emailVerificationOtpHash: hashOtp(knownOtp),
        emailVerificationOtpExpiresAt: new Date(Date.now() + 600000),
        emailVerificationAttempts: 0,
      }
    );

    const verifySuccessRes = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: knownOtp }),
    });
    const verifySuccessData = await verifySuccessRes.json();
    assert(verifySuccessRes.status === 200, 'Verification returns 200 OK');
    assert(verifySuccessData.success === true, 'Verification response success is true');
    assert(Boolean(verifySuccessData.token), 'Verification returns JWT token for immediate authenticated session');
    assert(verifySuccessData.user.emailVerified === true, 'Returned user object has emailVerified: true');

    // Verify DB state after activation
    const verifiedDbUser = await User.findOne({ email: testEmail });
    assert(verifiedDbUser.emailVerified === true, 'MongoDB record has emailVerified = true');
    assert(verifiedDbUser.emailVerificationOtpHash === null, 'OTP hash is cleared from database');
    assert(verifiedDbUser.emailVerificationOtpExpiresAt === null, 'OTP expiry is cleared from database');

    // ----------------------------------------------------
    // Test 13: Verified User Login
    // ----------------------------------------------------
    console.log('\n--- Test 13: Verified User Login ---');
    const verifiedLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const verifiedLoginData = await verifiedLoginRes.json();
    assert(verifiedLoginRes.status === 200, 'Verified user login returns 200 OK');
    assert(Boolean(verifiedLoginData.token), 'Login returns valid JWT token');
    assert(verifiedLoginData.user.email === testEmail, 'Login returns matching user profile');

    // ----------------------------------------------------
    // Test 14: Verified User Accesses Protected Endpoints
    // ----------------------------------------------------
    console.log('\n--- Test 14: Verified User Protected Route Access ---');
    const authHeaders = { Authorization: `Bearer ${verifiedLoginData.token}` };
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK for verified user');
    assert(meData.user.emailVerified === true, 'Profile indicates verified status');

    const docsRes = await fetch(`${API_BASE}/documents`, { headers: authHeaders });
    assert(docsRes.status === 200, 'GET /api/documents returns 200 OK for verified user');

    // ----------------------------------------------------
    // Test 15: Duplicate Registration For Verified Account Rejected
    // ----------------------------------------------------
    console.log('\n--- Test 15: Duplicate Registration Rejection ---');
    const dupRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate User', email: testEmail, password: 'AnotherPassword123!' }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 400, 'Duplicate registration for verified account returns 400 Bad Request');
    assert(dupData.message.includes('already exists'), 'Message informs user that account already exists');

    // ----------------------------------------------------
    // Test 16: Safe Retry for Pending Unverified Registrations
    // ----------------------------------------------------
    console.log('\n--- Test 16: Safe Retry for Unverified Registrations ---');
    const pendingEmail = `pending_${Date.now()}@healthvault.local`;
    // Initial registration
    await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pending User', email: pendingEmail, password: testPassword }),
    });

    // Advance lastSentAt past 60s cooldown
    await User.updateOne({ email: pendingEmail }, { emailVerificationLastSentAt: new Date(Date.now() - 65000) });

    // Re-register before verifying
    const retryRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pending User Updated', email: pendingEmail, password: 'NewStrongPassword123!' }),
    });
    const retryData = await retryRes.json();
    assert(retryRes.status === 200, 'Safe retry updates pending unverified account with 200 OK');
    assert(retryData.requiresVerification === true, 'Safe retry requires verification and does not throw duplicate error');

    // Clean up test data
    await User.deleteMany({ email: { $in: [testEmail, pendingEmail] } });
    console.log('\n✓ Test user records cleaned up from database');

    console.log('\n====================================================');
    console.log(` ALL ${totalTests} TESTS PASSED SUCCESSFULLY! (${passedCount}/${totalTests})`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
