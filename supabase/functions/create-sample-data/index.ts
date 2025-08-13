import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating sample data...');

    // First, create demo user accounts in auth.users
    const demoUsers = [
      {
        email: 'sarah@demo.com',
        password: 'demo123!',
        username: 'demo_user1',
        display_name: 'Sarah Johnson',
        bio: 'Content creator & dancer 💃 Follow for daily dance videos!',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'
      },
      {
        email: 'mike@demo.com', 
        password: 'demo123!',
        username: 'demo_user2',
        display_name: 'Mike Chen',
        bio: 'Comedy & lifestyle content creator 😄',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
      },
      {
        email: 'alex@demo.com',
        password: 'demo123!', 
        username: 'demo_user3',
        display_name: 'Alex Rivera',
        bio: 'Artist & creative storyteller ✨',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
      }
    ];

    const userIds: string[] = [];

    // Create demo users
    for (const user of demoUsers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          display_name: user.display_name
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        continue;
      }

      if (authData.user) {
        userIds.push(authData.user.id);
        
        // Update the profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: user.username,
            display_name: user.display_name,
            bio: user.bio,
            avatar_url: user.avatar_url,
            followers_count: Math.floor(Math.random() * 3000) + 500,
            following_count: Math.floor(Math.random() * 500) + 50,
            videos_count: Math.floor(Math.random() * 50) + 5
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
    }

    console.log('Created users:', userIds);

    // Create sample videos
    const sampleVideos = [
      {
        title: 'Morning Dance Routine',
        description: 'Starting the day with some positive energy! 💫',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        duration: 15,
        likes_count: 234,
        comments_count: 12,
        views_count: 1520,
        hashtags: ['dance', 'morning', 'energy']
      },
      {
        title: 'Funny Pet Compilation',
        description: 'My cats being absolutely ridiculous as usual 😂',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
        duration: 12,
        likes_count: 189,
        comments_count: 8,
        views_count: 967,
        hashtags: ['pets', 'funny', 'cats']
      },
      {
        title: 'Time-lapse Art Creation',
        description: 'Creating magic with watercolors ✨',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400',
        duration: 18,
        likes_count: 456,
        comments_count: 23,
        views_count: 2100,
        hashtags: ['art', 'timelapse', 'watercolor']
      },
      {
        title: 'Quick Smoothie Recipe',
        description: 'Healthy and delicious in under 2 minutes! 🥤',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400',
        duration: 8,
        likes_count: 312,
        comments_count: 15,
        views_count: 1789,
        hashtags: ['recipe', 'healthy', 'smoothie']
      },
      {
        title: 'City Sunset Vibes',
        description: 'Golden hour hits different in the city 🌅',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        duration: 10,
        likes_count: 278,
        comments_count: 19,
        views_count: 1456,
        hashtags: ['sunset', 'city', 'vibes']
      }
    ];

    const videoIds: string[] = [];

    // Insert sample videos
    for (let i = 0; i < sampleVideos.length; i++) {
      const video = sampleVideos[i];
      const userId = userIds[i % userIds.length]; // Distribute videos among users

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: userId,
          ...video
        })
        .select('id')
        .single();

      if (videoError) {
        console.error('Error creating video:', videoError);
      } else if (videoData) {
        videoIds.push(videoData.id);
      }
    }

    console.log('Created videos:', videoIds);

    // Create sample comments
    const sampleComments = [
      { content: 'Love the energy! Definitely trying this tomorrow 💪' },
      { content: 'Your moves are so smooth! Tutorial please? 🙏' },
      { content: 'Hahaha that last clip got me! 😂 Your cats are hilarious' },
      { content: 'This made my day! More pet content please! 🐱' },
      { content: 'Incredible talent! The colors blend so beautifully ✨' },
      { content: 'Mind blown! How long did this take to create?' },
      { content: 'Definitely making this for breakfast! Looks amazing 🥤' },
      { content: 'Beautiful shot! What camera did you use? 📸' }
    ];

    // Add comments to videos
    for (let i = 0; i < sampleComments.length && i < videoIds.length; i++) {
      const comment = sampleComments[i];
      const videoId = videoIds[i % videoIds.length];
      const userId = userIds[(i + 1) % userIds.length]; // Different user from video creator

      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          user_id: userId,
          video_id: videoId,
          content: comment.content
        });

      if (commentError) {
        console.error('Error creating comment:', commentError);
      }
    }

    // Create some follow relationships
    for (let i = 0; i < userIds.length; i++) {
      for (let j = 0; j < userIds.length; j++) {
        if (i !== j && Math.random() > 0.3) { // 70% chance to follow
          const { error: followError } = await supabase
            .from('follows')
            .insert({
              follower_id: userIds[i],
              following_id: userIds[j]
            });

          if (followError && !followError.message.includes('duplicate')) {
            console.error('Error creating follow:', followError);
          }
        }
      }
    }

    // Create some likes
    for (const videoId of videoIds) {
      for (const userId of userIds) {
        if (Math.random() > 0.4) { // 60% chance to like
          const { error: likeError } = await supabase
            .from('likes')
            .insert({
              user_id: userId,
              video_id: videoId
            });

          if (likeError && !likeError.message.includes('duplicate')) {
            console.error('Error creating like:', likeError);
          }
        }
      }
    }

    console.log('Sample data created successfully!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sample data created successfully!',
        users: userIds.length,
        videos: videoIds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating sample data:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});