import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "main.jsx"), "utf8");
const checks = [];

checkRazorpayClientFlow();
checkProductionPaidActivationGuard();
checkClientSecretBoundaries();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkRazorpayClientFlow() {
  pushCheck("Client starts More Guidance checkout through backend Razorpay order route", [
    source.includes("async function startCheckout()"),
    source.includes("authFetch(getApiUrl(\"/api/create-razorpay-order\")"),
    source.includes("await openRazorpayCheckout({"),
    source.includes("setCheckoutStatus(\"Preparing secure checkout...\");"),
    source.includes("trackEvent(\"more_guidance_checkout_started\")")
  ].every(Boolean));

  pushCheck("Client loads and opens Razorpay Checkout with server-owned order details", [
    source.includes("function loadRazorpayCheckout()"),
    source.includes("https://checkout.razorpay.com/v1/checkout.js"),
    source.includes("new window.Razorpay({"),
    source.includes("key: order.keyId"),
    source.includes("amount: order.amount"),
    source.includes("currency: order.currency || \"INR\""),
    source.includes("order_id: order.orderId"),
    source.includes("handler: onSuccess"),
    source.includes("checkout.on(\"payment.failed\""),
    source.includes("checkout.open();")
  ].every(Boolean));

  pushCheck("Client verifies Razorpay payment with backend before activation", [
    source.includes("async function verifyRazorpayPayment({ user, order, payment })"),
    source.includes("authFetch(getApiUrl(\"/api/verify-razorpay-payment\")"),
    source.includes("orderId: order.orderId"),
    source.includes("amount: order.amount"),
    source.includes("currency: order.currency || \"INR\""),
    source.includes("orderToken: order.orderToken"),
    source.includes("paymentId: payment.razorpay_payment_id"),
    source.includes("signature: payment.razorpay_signature"),
    source.includes("if (!response.ok || !data.verified)")
  ].every(Boolean));
}

function checkProductionPaidActivationGuard() {
  const demoActivationMatches = source.match(/activatePlan\(\{\s*provider:\s*"demo"/g) || [];
  pushCheck("Demo payment activation is gated to explicit demo payment mode", [
    source.includes("const DEMO_PAYMENTS_ENABLED = import.meta.env.VITE_DEMO_PAYMENTS === \"true\" || import.meta.env.MODE !== \"production\";"),
    source.includes("if (!response.ok) {\n        if (DEMO_PAYMENTS_ENABLED) {"),
    demoActivationMatches.length === 1
  ].every(Boolean), [`demoActivationMatches=${demoActivationMatches.length}`]);

  pushCheck("Production paid activation requires stored backend subscription", [
    source.includes("if (!data.stored && !LOCAL_PAID_FALLBACK_ENABLED) {"),
    source.includes("throw new Error(\"Payment verified, but the subscription was not stored. Please contact support.\");"),
    source.includes("provider: \"razorpay\""),
    source.includes("paymentStatus: \"verified\""),
    source.includes("razorpayOrderId: order.orderId"),
    source.includes("razorpayPaymentId: payment.razorpay_payment_id")
  ].every(Boolean));
}

function checkClientSecretBoundaries() {
  pushCheck("Client payment flow does not reference Razorpay server secrets", [
    !source.includes("RAZORPAY_KEY_SECRET"),
    !source.includes("RAZORPAY_WEBHOOK_SECRET")
  ].every(Boolean));
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Client payment flow contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    if (!check.passed && check.details?.length) {
      console.log(`  Details: ${check.details.join(", ")}`);
    }
  }
}
