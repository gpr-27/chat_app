import { v2 as cloudinary } from "cloudinary";
import config from "../config/index.js";
import logger from "./logger.js";

// Image/avatar uploads are optional. When Cloudinary isn't configured we leave
// the SDK unconfigured and the controllers skip uploads (text-only mode), so a
// missing Cloudinary account never blocks the server from booting.
if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
} else {
  logger.warn(
    "Cloudinary not configured — image & avatar uploads are disabled (text chat + calls still work). " +
      "Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to enable them."
  );
}

// Whether image uploads are available — controllers check this before uploading.
export const cloudinaryEnabled = config.cloudinary.enabled;

export default cloudinary;
