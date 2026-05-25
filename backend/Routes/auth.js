const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, phoneNumber, email, password, confirmPassword } = req.body;

    if (!username || !phoneNumber || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "Please fill all required fields." });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ error: "Phone number already in use." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.toLowerCase().trim(),
      password: hashed
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password, rememberMe } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phoneNumber: emailOrPhone }]
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or phone number." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid password." });
    }

    const expiresIn = rememberMe ? "7d" : "1d";
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login error: " + err.message });
  }
});

// Get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email phoneNumber");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Could not load profile: " + err.message });
  }
});

// Update profile
router.put("/me", auth, async (req, res) => {
  try {
    const { username, email, phoneNumber } = req.body;
    const updates = {};

    if (username) updates.username = username.trim();
    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use." });
      }
      updates.email = email.toLowerCase().trim();
    }
    if (phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber, _id: { $ne: req.user.id } });
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already in use." });
      }
      updates.phoneNumber = phoneNumber.trim();
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, select: "username email phoneNumber" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Could not update profile: " + err.message });
  }
});

// Change password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Could not change password: " + err.message });
  }
});

// Seed test user
router.post("/seed", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: "nikesh@gmail.com" });
    if (existingUser) {
      return res.json({ message: "Test user already exists", email: "nikesh@gmail.com", password: "nikesh@2005" });
    }

    const hashed = await bcrypt.hash("nikesh@2005", 10);
    const testUser = new User({
      username: "Nikesh",
      phoneNumber: "9876543210",
      email: "nikesh@gmail.com",
      password: hashed
    });
    await testUser.save();

    res.json({ message: "Test user created", email: "nikesh@gmail.com", password: "nikesh@2005" });
  } catch (err) {
    res.status(500).json({ error: "Seed error: " + err.message });
  }
});

module.exports = router;