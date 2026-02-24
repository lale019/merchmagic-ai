import express from "express";
import { createServer as createViteServer } from "vite";
import cookieSession from "cookie-session";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Mock Database (In-memory for this example, would use SQLite/Postgres in production)
const users: Record<string, any> = {};

app.use(express.json({ limit: '50mb' }));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'merchmagic-secret'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: true,
  sameSite: 'none'
}));

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

// Auth Middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// --- API ROUTES ---

// Google Auth URL
app.get("/api/auth/google/url", (req, res) => {
  let appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (!appUrl.startsWith('http')) {
    appUrl = `https://${appUrl}`;
  }
  const redirectUri = `${appUrl}/auth/callback`;
  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    redirect_uri: redirectUri
  });
  res.json({ url });
});

// Google Auth Callback
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  let appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (!appUrl.startsWith('http')) {
    appUrl = `https://${appUrl}`;
  }
  const redirectUri = `${appUrl}/auth/callback`;
  
  try {
    const { tokens } = await googleClient.getToken({
      code: code as string,
      redirect_uri: redirectUri
    });
    
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid payload");

    const userId = payload.sub;
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        generationsUsed: 0,
        lastGenerationDate: new Date().toDateString(),
        isPro: false,
        freeLimit: 5
      };
    }

    req.session.userId = userId;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. Closing window...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).send("Authentication failed");
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// Delete Account (Required for Play Store)
app.post("/api/user/delete-account", requireAuth, (req, res) => {
  const userId = req.session.userId;
  if (users[userId]) {
    delete users[userId];
    req.session = null;
    return res.json({ success: true, message: "Account and data deleted successfully." });
  }
  res.status(404).json({ error: "User not found" });
});

// Get Profile
app.get("/api/user/profile", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = users[req.session.userId];
  if (!user) {
    req.session = null; // Clear stale session
    return res.json({ user: null });
  }
  res.json({ user });
});

// Check/Increment Generation Limit
app.post("/api/user/generate", requireAuth, (req, res) => {
  const user = users[req.session.userId];
  
  if (!user) {
    return res.status(401).json({ error: "Session expired", message: "Please log in again." });
  }

  // Daily Reset Logic
  const today = new Date().toDateString();
  if (user.lastGenerationDate !== today) {
    user.generationsUsed = 0;
    user.lastGenerationDate = today;
  }

  if (!user.isPro && user.generationsUsed >= user.freeLimit) {
    return res.status(403).json({ 
      error: "Limit reached", 
      message: "You've reached your daily limit of 5 generations. Upgrade to Pro for unlimited access!" 
    });
  }

  user.generationsUsed += 1;
  res.json({ success: true, generationsUsed: user.generationsUsed });
});

// Stripe Checkout
app.post("/api/create-checkout-session", requireAuth, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'MerchMagic Pro',
            description: 'Unlimited AI Mockup Generations',
          },
          unit_amount: 999, // $9.99
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancel`,
      metadata: {
        userId: req.session.userId
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for Stripe (Simulated for this environment, in real app use stripe.webhooks.constructEvent)
app.post("/api/webhooks/stripe", express.raw({type: 'application/json'}), (req, res) => {
  // In a real app, you'd verify the signature
  const event = req.body;
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    if (users[userId]) {
      users[userId].isPro = true;
    }
  }
  res.json({ received: true });
});

// Digital Asset Links for Play Store (TWA)
app.get("/.well-known/assetlinks.json", (req, res) => {
  const sha256 = process.env.ANDROID_SHA256 || "YOUR_SHA256_HERE";
  const packageName = process.env.ANDROID_PACKAGE_NAME || "com.merchmagic.app";
  
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": packageName,
      "sha256_cert_fingerprints": [sha256]
    }
  }]);
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  // Explicitly serve manifest and service worker
  app.get("/manifest.json", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "manifest.json"));
  });
  app.get("/sw.js", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "sw.js"));
  });

  // Serve public folder for other assets
  app.use(express.static(path.join(__dirname, "public")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();