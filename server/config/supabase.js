const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your_supabase_anon_key';

// Check if credentials are placeholder or valid
const isPlaceholder =
  !supabaseUrl ||
  supabaseUrl.includes('your-project') ||
  !supabaseKey ||
  supabaseKey.includes('your_supabase_anon_key');

let supabase = null;

if (!isPlaceholder) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase Client Initialized]: Connected to cloud storage');
  } catch (error) {
    console.warn('[Supabase Client Warning]:', error.message);
  }
} else {
  console.log('[Supabase Storage]: Running in local fallback mode for development');
}

const BUCKET_NAME = 'workspace-files';

/**
 * Upload file object to Supabase storage bucket (or local fallback)
 */
const uploadToSupabase = async (fileBuffer, mimeType, supabasePath) => {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(supabasePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;
    return data.path;
  } else {
    // Local storage fallback for development when no Supabase key is provided
    const localDir = path.join(__dirname, '../uploads', path.dirname(supabasePath));
    fs.mkdirSync(localDir, { recursive: true });
    const localFilePath = path.join(__dirname, '../uploads', supabasePath);
    fs.writeFileSync(localFilePath, fileBuffer);
    return supabasePath;
  }
};

/**
 * Generate 1-hour signed download URL
 */
const getSignedDownloadUrl = async (supabasePath) => {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(supabasePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  } else {
    // Local fallback download endpoint
    return `http://localhost:${process.env.PORT || 5000}/api/local-files/${encodeURIComponent(supabasePath)}`;
  }
};

/**
 * Delete file object from storage bucket
 */
const deleteFromSupabase = async (supabasePath) => {
  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([supabasePath]);
    if (error) console.error('[Supabase Delete Warning]:', error.message);
  } else {
    const localFilePath = path.join(__dirname, '../uploads', supabasePath);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }
};

module.exports = {
  supabase,
  uploadToSupabase,
  getSignedDownloadUrl,
  deleteFromSupabase,
  BUCKET_NAME,
};
