import axios from 'axios';
import FormData from 'form-data';

const IPFS_URL = process.env.IPFS_API_URL || 'http://127.0.0.1:5001/api/v0';

export const ipfsSercive = {
  uploadContent: async (content: string): Promise<string> => {
    try {
      const form = new FormData();
      form.append('file', Buffer.from(content), 'agreement.enc');

      const res = await axios.post(`${IPFS_URL}/add`, form, {
        headers: { ...form.getHeaders() }
      });

      return res.data.Hash;
    } catch (error) {
      console.log("IPFS upload error: ", error);
      throw new Error("Failed to upload to IPFS");
    }
  },

  retrieveContent: async (cid: string): Promise<string> => {
    try {
      const res = await axios.post(`${IPFS_URL}/cat?arg=${cid}`, {}, {
        responseType: 'text'
      });
      return res.data;
    } catch (error) {
      console.error("IPFS retrieve error: ", error);
      throw new Error("Failed to retrieve from IPFS");
    }
  }
};