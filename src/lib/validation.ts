import { z } from "zod";

// Video upload validation
export const videoUploadSchema = z.object({
  file: z.custom<File>((file) => {
    if (!(file instanceof File)) return false;
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) return false;
    
    // Check file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) return false;
    
    return true;
  }, {
    message: "File must be a video (MP4, WebM, MOV) under 50MB"
  }),
  duration: z.number().max(60, "Video must be under 60 seconds"),
});

// Video metadata validation
export const videoMetadataSchema = z.object({
  title: z.string()
    .max(150, "Title must be under 150 characters")
    .optional(),
  description: z.string()
    .max(2000, "Description must be under 2000 characters")
    .optional(),
  hashtags: z.array(z.string().regex(/^#[a-zA-Z0-9_]+$/, "Invalid hashtag format"))
    .max(10, "Maximum 10 hashtags allowed")
    .optional(),
  audio_title: z.string()
    .max(100, "Audio title must be under 100 characters")
    .optional(),
});

// User profile validation
export const userProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be under 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  display_name: z.string()
    .min(1, "Display name is required")
    .max(50, "Display name must be under 50 characters"),
  bio: z.string()
    .max(500, "Bio must be under 500 characters")
    .optional(),
  avatar_url: z.string().url().optional(),
});

// Comment validation
export const commentSchema = z.object({
  content: z.string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment must be under 500 characters")
    .refine((content) => {
      // Basic profanity filter - in production, use a proper service
      const bannedWords = ['spam', 'scam', 'fake'];
      return !bannedWords.some(word => content.toLowerCase().includes(word));
    }, "Comment contains inappropriate content"),
});

// Search validation
export const searchSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(100, "Search query must be under 100 characters"),
});

// Validation utilities
export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  try {
    videoUploadSchema.parse({ file, duration: 0 }); // Duration will be checked separately
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0].message };
    }
    return { valid: false, error: "Invalid file" };
  }
};

export const validateVideoMetadata = (data: any): { valid: boolean; error?: string } => {
  try {
    videoMetadataSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0].message };
    }
    return { valid: false, error: "Invalid metadata" };
  }
};

export const validateComment = (content: string): { valid: boolean; error?: string } => {
  try {
    commentSchema.parse({ content });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0].message };
    }
    return { valid: false, error: "Invalid comment" };
  }
};

// Content moderation helpers
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex) || [];
  return [...new Set(matches)].slice(0, 10); // Limit to 10 unique hashtags
};

export const sanitizeText = (text: string): string => {
  // Remove potentially harmful content
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};