/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://ai-interview-mocker_owner:2BnylSzWe1Pt@ep-rough-violet-a5giyqvt.us-east-2.aws.neon.tech/ai-interview-mocker?sslmode=require',
    }
  };