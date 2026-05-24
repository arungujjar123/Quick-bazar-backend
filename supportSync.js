const mongoose = require("mongoose");
require("dotenv").config();

const { syncSupportDocs } = require("./support/supportDocs");

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const summary = await syncSupportDocs();
  console.log("Support docs synced:");
  console.log(summary);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Support sync failed:", error.message);
  process.exitCode = 1;
});
