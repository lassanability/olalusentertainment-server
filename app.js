const express = require("express");
const app = express();
app.set('trust proxy', 1);
const cors = require("cors");
require("dotenv").config({ path: ".env" });

const REQUIRED_ENV = [
  'PORT', 'MONGO_CONNECTION_URL',
  'SEAWEED_S3_URL', 'SEAWEED_BUCKET', 'SEAWEED_ACCESS_KEY', 'SEAWEED_SECRET_KEY',
  'JWT_SECRET', 'ADMIN_EMAIL',
  'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS',
  'SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID', 'SQUARE_ENVIRONMENT',
];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[!] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const morgan = require("morgan");
const { applySecurityMiddleware, buildCorsOptions } = require("./middleware/security");
const { connectDB } = require("./config/db");
const { initSuperAdmin } = require("./config/superAdmin");

const authRoute = require("./routes/auth");
const adminUserRoute = require("./routes/adminUser");
const commentRoute = require("./routes/comment");
const logRoute = require("./routes/log");
const bannerRoute = require("./routes/banner");
const faqRoute = require("./routes/faq");
const blogRoute = require("./routes/blog");
const contactRoute = require("./routes/contact");
const newsletterRoute = require("./routes/newsletter");
const aboutRoute = require("./routes/about");
const policyRoute = require("./routes/policy");
const contactInfoRoute = require("./routes/contactInfo");
const eventRoute = require("./routes/event");
const checkoutRoute = require("./routes/checkout");
const webhookRoute = require("./routes/webhook");
const ticketRoute = require("./routes/ticket");
const testimonialRoute = require("./routes/testimonial");
const recentShowRoute = require("./routes/recentShow");
const appSettingsRoute = require("./routes/appSettings");

connectDB().then(() => initSuperAdmin());

const PORT = process.env.PORT;
const WEBSITE = process.env.WEBSITE;
const ADMIN_DASHBOARD = process.env.ADMIN_DASHBOARD;

const corsOptions = buildCorsOptions(WEBSITE, ADMIN_DASHBOARD);

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use("/api/v1/webhooks", webhookRoute);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  res.setTimeout(0);
  req.setTimeout(0);
  next();
});
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

applySecurityMiddleware(app);

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/admin-users", adminUserRoute);
app.use("/api/v1/logs", logRoute);

app.use("/api/v1/banner", bannerRoute);
app.use("/api/v1/faq", faqRoute);
app.use("/api/v1/blog", blogRoute);
app.use("/api/v1/contact", contactRoute);
app.use("/api/v1/comments", commentRoute);
app.use("/api/v1/about", aboutRoute);
app.use("/api/v1/policies", policyRoute);
app.use("/api/v1/contact-info", contactInfoRoute);
app.use("/api/v1/newsletter", newsletterRoute);
app.use("/api/v1/events", eventRoute);
app.use("/api/v1/checkout", checkoutRoute);
app.use("/api/v1/tickets", ticketRoute);
app.use("/api/v1/testimonials", testimonialRoute);
app.use("/api/v1/recent-shows", recentShowRoute);
app.use("/api/v1/app-settings", appSettingsRoute);

app.get("/", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development',
    memory: mem.heapUsed,
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ status: 'error', message: "An unexpected error occurred" });
});

app.listen(PORT, () => {
  console.log(`[+] Olalus Entertainment server running on port ${PORT}`);
  console.log(`[+] Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on("SIGINT", async () => {
  console.log("[-] Shutting down...");
  process.exit(0);
});
