import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env.js';

export class CloudinaryService {
  /**
   * Upload an image (base64 data URI or remote URL) to Cloudinary
   * @param {string} fileData - Base64 Data URI ('data:image/...') or public image URL
   * @param {string} [folder='ekpost'] - Cloudinary folder
   * @returns {Promise<{ url: string, publicId: string, format: string, width: number, height: number }>}
   */
  static async uploadImage(fileData, folder = 'ekpost') {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
    }

    if (!fileData) {
      throw new Error('No image data provided for upload.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', fileData);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const res = await axios.post(uploadUrl, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024
    });

    return {
      url: res.data.secure_url,
      publicId: res.data.public_id,
      format: res.data.format,
      width: res.data.width,
      height: res.data.height
    };
  }
}
