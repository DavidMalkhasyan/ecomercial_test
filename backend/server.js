const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✓ DB connected"))
  .catch(err => {
    console.error("✗ DB connection error:", err.message);
    process.exit(1);
  });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: {
    type: String,
    default: 'https://via.placeholder.com/250x200?text=No+Image'
  },
  category: { type: String, required: true, trim: true }
}, { timestamps: true });

productSchema.index({ category: 1 });
productSchema.index({ name: "text" });

const Product = mongoose.model("Product", productSchema);

app.get("/products", async (req, res) => {
  try {
    const products = await Product.find().select("-__v");
    res.json(products);
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/products", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const productData = {
      name: name.trim(),
      price: Number(price),
      category: category.trim()
    };

    if (req.file) {
      productData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (err) {
    console.error("POST /products error:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});